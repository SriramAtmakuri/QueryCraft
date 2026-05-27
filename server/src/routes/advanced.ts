import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { Parser } from 'node-sql-parser';
import { PrismaClient } from '@prisma/client';
import { generateContent } from '../aiProvider';
import { validate } from '../middleware/validate';
import { getCached, setCached, cacheKey } from '../cache';

const prisma = new PrismaClient();

const sqlParser = new Parser();

interface TableRef { table: string; count: number }
interface ColumnRef { table: string; column: string }

function extractRefsFromSQL(sql: string): { tables: TableRef[]; columns: ColumnRef[] } {
  const tableCount = new Map<string, number>();
  const columnSet = new Set<string>();
  try {
    const ast = sqlParser.astify(sql, { database: 'PostgreSQL' });
    const nodes = Array.isArray(ast) ? ast : [ast];
    for (const node of nodes) {
      const str = JSON.stringify(node);
      // Count table references
      const tableMatches = str.matchAll(/"table":"([^"]+)"/g);
      for (const m of tableMatches) tableCount.set(m[1], (tableCount.get(m[1]) ?? 0) + 1);
      // Collect column references
      const colMatches = str.matchAll(/"column":"([^"]+)","table":"([^"]+)"/g);
      for (const m of colMatches) columnSet.add(`${m[2]}.${m[1]}`);
    }
  } catch { /* fall through — unparseable SQL handled by AI */ }
  return {
    tables: Array.from(tableCount.entries()).map(([table, count]) => ({ table, count })),
    columns: Array.from(columnSet).map(ref => {
      const [table, column] = ref.split('.');
      return { table, column };
    }),
  };
}

const router = Router();

const semanticDiffSchema = z.object({
  sql1: z.string().min(1).max(50000),
  sql2: z.string().min(1).max(50000),
  dialect: z.string().default('postgresql'),
});

const schemaDriftSchema = z.object({
  schema: z.string().min(1).max(100000),
  queries: z.array(z.string().max(50000)).min(1).max(100),
  dialect: z.string().default('postgresql'),
});

const inferMigrationsSchema = z.object({
  schema: z.string().min(1).max(100000),
  queries: z.array(z.string().max(50000)).min(1).max(100),
  dialect: z.string().default('postgresql'),
});

const dialectCostSchema = z.object({
  sql: z.string().min(1).max(50000),
  schema: z.string().optional(),
  dialects: z.array(z.enum(['postgresql', 'mysql', 'sqlite', 'sqlserver'])).min(1).max(4).default(['postgresql', 'mysql', 'sqlite', 'sqlserver']),
});

router.post('/semantic-diff', validate(semanticDiffSchema), async (req, res, next) => {
  try {
    const { sql1, sql2, dialect } = req.body;
    const key = cacheKey('semantic-diff', sql1, sql2, dialect);
    const cached = getCached(key);
    if (cached) return res.json(cached);

    const result = await generateContent({
      prompt: `You are an expert SQL analyst. Compare these two ${dialect} SQL queries and determine if they are semantically equivalent — meaning they return the same results for any given dataset.

Query A:
\`\`\`sql
${sql1}
\`\`\`

Query B:
\`\`\`sql
${sql2}
\`\`\`

Analyze: column selection, filtering logic, JOIN semantics, ordering, grouping, NULLs, edge cases with empty sets, duplicate handling (DISTINCT), and any dialect-specific behavior.

Respond ONLY with valid JSON matching this exact structure:
{
  "isEquivalent": boolean,
  "confidence": "high" | "medium" | "low",
  "summary": "one sentence summary",
  "differences": [
    { "type": "string", "description": "string", "impact": "high" | "medium" | "low" }
  ],
  "edgeCases": ["string"],
  "recommendation": "string"
}`,
      temperature: 0.1,
      maxTokens: 1024,
    });

    const cleaned = result.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
    setCached(key, parsed);
    res.json(parsed);
  } catch (err: unknown) {
    next(err);
  }
});

router.post('/schema-drift', validate(schemaDriftSchema), async (req, res, next) => {
  try {
    const { schema, queries, dialect } = req.body;
    const key = cacheKey('schema-drift', schema, queries.slice(0, 5).join('|'), dialect);
    const cached = getCached(key);
    if (cached) return res.json(cached);

    // Deterministic AST pass — extract real table/column access counts
    const allRefs = queries.slice(0, 50).map((q: string) => extractRefsFromSQL(q));
    const tableHits = new Map<string, number>();
    const columnHits = new Map<string, number>();
    for (const { tables, columns } of allRefs) {
      for (const { table, count } of tables) tableHits.set(table, (tableHits.get(table) ?? 0) + count);
      for (const { table, column } of columns) {
        const key2 = `${table}.${column}`;
        columnHits.set(key2, (columnHits.get(key2) ?? 0) + 1);
      }
    }
    const tableAccessSummary = Array.from(tableHits.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([t, n]) => `${t}: ${n} references`)
      .join(', ');
    const columnAccessSummary = Array.from(columnHits.entries())
      .sort(([, a], [, b]) => b - a).slice(0, 20)
      .map(([c, n]) => `${c}: ${n} uses`)
      .join(', ');

    const sampleQueries = queries.slice(0, 30).join('\n-- next query --\n');

    const result = await generateContent({
      prompt: `You are a database performance expert. Analyze this ${dialect} schema and query history to detect schema drift.

Schema:
\`\`\`sql
${schema}
\`\`\`

AST-parsed table access counts (deterministic, from ${queries.length} queries): ${tableAccessSummary || 'none parsed'}
AST-parsed column access counts: ${columnAccessSummary || 'none parsed'}

Query history sample:
\`\`\`sql
${sampleQueries}
\`\`\`

Use the AST counts above as ground truth for hotTables.queryCount. Tables with 0 AST references are strong unused candidates.

Respond ONLY with valid JSON:
{
  "unusedTables": [{ "table": "string", "confidence": "high"|"medium"|"low", "suggestion": "string" }],
  "unusedColumns": [{ "table": "string", "column": "string", "suggestion": "string" }],
  "hotTables": [{ "table": "string", "queryCount": number, "insight": "string" }],
  "indexSuggestions": [
    { "table": "string", "columns": ["string"], "reason": "string", "sql": "string", "impact": "high"|"medium"|"low" }
  ],
  "summary": "string"
}`,
      temperature: 0.2,
      maxTokens: 2048,
    });

    const cleaned = result.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
    setCached(key, parsed);
    res.json(parsed);
  } catch (err: unknown) {
    next(err);
  }
});

router.post('/infer-migrations', validate(inferMigrationsSchema), async (req, res, next) => {
  try {
    const { schema, queries, dialect } = req.body;
    const key = cacheKey('infer-migrations', schema, queries.slice(0, 5).join('|'), dialect);
    const cached = getCached(key);
    if (cached) return res.json(cached);

    // Deterministic: extract join patterns + high-frequency filter columns from AST
    const allRefs = queries.slice(0, 50).map((q: string) => extractRefsFromSQL(q));
    const columnFreq = new Map<string, number>();
    for (const { columns } of allRefs) {
      for (const { table, column } of columns) {
        const k = `${table}.${column}`;
        columnFreq.set(k, (columnFreq.get(k) ?? 0) + 1);
      }
    }
    const frequentCols = Array.from(columnFreq.entries())
      .filter(([, n]) => n >= 2)
      .sort(([, a], [, b]) => b - a)
      .map(([c, n]) => `${c} (${n}x)`)
      .join(', ');

    const sampleQueries = queries.slice(0, 30).join('\n-- next query --\n');

    const result = await generateContent({
      prompt: `You are a senior database architect. Analyze this ${dialect} schema and query patterns to infer what database migrations would improve the schema.

Current schema:
\`\`\`sql
${schema}
\`\`\`

Frequently referenced columns (AST-parsed, ${queries.length} queries): ${frequentCols || 'none parsed'}

Query patterns:
\`\`\`sql
${sampleQueries}
\`\`\`

Generate migration recommendations grounded in the column frequency data above. Prioritize high-frequency columns for indexes.

Generate migration recommendations based on: JOIN patterns (missing FK), frequently filtered columns (missing indexes), repeated computed values (missing stored columns), implicit relationships visible in queries.

Respond ONLY with valid JSON:
{
  "migrations": [
    {
      "description": "string",
      "type": "add_index"|"add_foreign_key"|"add_column"|"add_constraint"|"create_table"|"other",
      "sql": "string",
      "risk": "low"|"medium"|"high",
      "reason": "string",
      "reverseSql": "string"
    }
  ],
  "summary": "string"
}`,
      temperature: 0.2,
      maxTokens: 2048,
    });

    const cleaned = result.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
    setCached(key, parsed);
    res.json(parsed);
  } catch (err: unknown) {
    next(err);
  }
});

router.post('/dialect-cost', validate(dialectCostSchema), async (req, res, next) => {
  try {
    const { sql, schema, dialects } = req.body;
    const key = cacheKey('dialect-cost', sql, schema, dialects.join(','));
    const cached = getCached(key);
    if (cached) return res.json(cached);

    const result = await generateContent({
      prompt: `You are a database internals expert. Analyze this SQL query and estimate execution cost characteristics across multiple SQL dialects. Consider query planner behavior, index usage, JOIN algorithms, and dialect-specific optimizations.

SQL Query:
\`\`\`sql
${sql}
\`\`\`

${schema ? `Schema context:\n\`\`\`sql\n${schema}\n\`\`\`\n` : ''}

Analyze for these dialects: ${dialects.join(', ')}

For each dialect consider: query planner differences, JOIN strategy (hash/nested loop/merge), index scan vs seq scan thresholds, function pushdown, parallel query support, NULL handling differences.

Respond ONLY with valid JSON:
{
  "analyses": [
    {
      "dialect": "string",
      "complexity": "low"|"medium"|"high"|"very_high",
      "scanComplexity": "O(1)"|"O(log n)"|"O(n)"|"O(n log n)"|"O(n²)",
      "bottlenecks": ["string"],
      "optimizations": ["string"],
      "dialectSpecificNotes": ["string"],
      "relativeScore": number
    }
  ],
  "fastestDialect": "string",
  "summary": "string",
  "portabilityWarnings": ["string"]
}

relativeScore: 1 (most efficient) to 10 (least efficient) relative to other analyzed dialects.`,
      temperature: 0.2,
      maxTokens: 2048,
    });

    const cleaned = result.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
    setCached(key, parsed);
    res.json(parsed);
  } catch (err: unknown) {
    next(err);
  }
});

// ── Blast Radius Analyzer ────────────────────────────────────────────────────
const blastRadiusSchema = z.object({
  schemaChange: z.string().min(1).max(10000),
  savedQueries: z.array(z.string().max(50000)).min(1).max(200),
  dialect: z.string().default('postgresql'),
});

router.post('/blast-radius', validate(blastRadiusSchema), async (req, res, next) => {
  try {
    const { schemaChange, savedQueries, dialect } = req.body;
    const key = cacheKey('blast-radius', schemaChange, savedQueries.slice(0, 3).join('|'), dialect);
    const cached = getCached(key);
    if (cached) return res.json(cached);

    // AST-extract tables from the schema change to find affected queries
    const changeRefs = extractRefsFromSQL(schemaChange);
    const changedTables = new Set(changeRefs.tables.map(t => t.table.toLowerCase()));

    // Also extract table names from the DDL text directly (parser may not handle ALTER well)
    const ddlTableMatch = schemaChange.match(/(?:alter|drop|rename)\s+table\s+(?:if\s+exists\s+)?(\w+)/gi) ?? [];
    for (const m of ddlTableMatch) {
      const parts = m.trim().split(/\s+/);
      const tbl = parts[parts.length - 1]?.toLowerCase();
      if (tbl) changedTables.add(tbl);
    }

    const affectedList = savedQueries
      .map((sql: string, idx: number) => {
        const refs = extractRefsFromSQL(sql);
        const hit = refs.tables.some(t => changedTables.has(t.table.toLowerCase()));
        return hit ? `Query ${idx + 1}: ${sql.slice(0, 200)}` : null;
      })
      .filter(Boolean)
      .join('\n');

    const result = await generateContent({
      prompt: `You are a database migration expert. A schema change is being applied. Identify which queries will break and suggest fixes.

Schema change (DDL):
\`\`\`sql
${schemaChange}
\`\`\`

Dialect: ${dialect}
Total queries analyzed: ${savedQueries.length}
Potentially affected queries (reference changed tables):
${affectedList || 'None detected by AST analysis'}

Respond ONLY with valid JSON:
{
  "affectedQueries": [
    { "sql": "string", "reason": "string", "severity": "breaking|warning|safe", "fixedSql": "string" }
  ],
  "safeQueries": number,
  "summary": "string",
  "migrationRisk": "high|medium|low"
}`,
      temperature: 0.2,
      maxTokens: 2048,
    });

    const cleaned = result.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
    setCached(key, parsed);
    res.json(parsed);
  } catch (err: unknown) {
    next(err);
  }
});

// ── Anomaly Detector ─────────────────────────────────────────────────────────
const anomalySchema = z.object({
  sql: z.string().min(1).max(50000),
  queryHistory: z.array(z.string().max(50000)).min(2).max(500),
  dialect: z.string().default('postgresql'),
});

router.post('/anomaly-detect', validate(anomalySchema), async (req, res, next) => {
  try {
    const { sql, queryHistory, dialect } = req.body;
    const key = cacheKey('anomaly', sql, queryHistory.slice(0, 3).join('|'), dialect);
    const cached = getCached(key);
    if (cached) return res.json(cached);

    const currentRefs = extractRefsFromSQL(sql);
    const histTableFreq = new Map<string, number>();
    for (const q of queryHistory.slice(0, 100) as string[]) {
      const refs = extractRefsFromSQL(q);
      for (const { table } of refs.tables) histTableFreq.set(table, (histTableFreq.get(table) ?? 0) + 1);
    }
    const historicalTableFreq = Array.from(histTableFreq.entries())
      .sort(([, a], [, b]) => b - a).slice(0, 10)
      .map(([t, n]) => `${t}: ${n}x`).join(', ');

    const result = await generateContent({
      prompt: `You are a SQL anomaly detection expert. Compare this query against historical query patterns and identify anomalies.

Current query:
\`\`\`sql
${sql}
\`\`\`

Historical baseline: ${queryHistory.length} queries
Table access frequency in history: ${historicalTableFreq || 'none'}
Current query tables: ${currentRefs.tables.map(t => t.table).join(', ') || 'none detected'}

Respond ONLY with valid JSON:
{
  "isAnomalous": boolean,
  "anomalyScore": number,
  "anomalies": [
    { "type": "string", "description": "string", "severity": "high|medium|low" }
  ],
  "baseline": { "avgTableCount": number, "commonPatterns": ["string"] },
  "recommendation": "string"
}

anomalyScore: 0–100 (higher = more anomalous).`,
      temperature: 0.2,
      maxTokens: 1024,
    });

    const cleaned = result.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
    setCached(key, parsed);
    res.json(parsed);
  } catch (err: unknown) {
    next(err);
  }
});

// ── Schema Recommendation Engine ─────────────────────────────────────────────
const schemaRecommendSchema = z.object({
  schema: z.string().min(1).max(100000),
  queries: z.array(z.string().max(50000)).min(1).max(100),
  dialect: z.string().default('postgresql'),
});

router.post('/schema-recommend', validate(schemaRecommendSchema), async (req, res, next) => {
  try {
    const { schema, queries, dialect } = req.body;
    const key = cacheKey('schema-recommend', schema.slice(0, 200), queries.slice(0, 3).join('|'), dialect);
    const cached = getCached(key);
    if (cached) return res.json(cached);

    const allRefs = (queries as string[]).slice(0, 50).map(q => extractRefsFromSQL(q));
    const tableHits = new Map<string, number>();
    const columnHits = new Map<string, number>();
    for (const { tables, columns } of allRefs) {
      for (const { table, count } of tables) tableHits.set(table, (tableHits.get(table) ?? 0) + count);
      for (const { table, column } of columns) {
        const k = `${table}.${column}`;
        columnHits.set(k, (columnHits.get(k) ?? 0) + 1);
      }
    }
    const tableHitsSummary = Array.from(tableHits.entries()).sort(([, a], [, b]) => b - a).slice(0, 10).map(([t, n]) => `${t}: ${n}x`).join(', ');
    const columnHitsSummary = Array.from(columnHits.entries()).sort(([, a], [, b]) => b - a).slice(0, 15).map(([c, n]) => `${c}: ${n}x`).join(', ');

    const result = await generateContent({
      prompt: `You are a senior database architect. Analyze the schema and query patterns to recommend schema redesigns that would improve performance and maintainability.

Schema:
\`\`\`sql
${schema}
\`\`\`

Query analysis: ${queries.length} queries analyzed
Hot tables (AST-parsed): ${tableHitsSummary || 'none'}
Hot columns (AST-parsed): ${columnHitsSummary || 'none'}

Respond ONLY with valid JSON:
{
  "recommendations": [
    {
      "type": "normalization|denormalization|partitioning|archiving|add_column|split_table|merge_tables|other",
      "title": "string",
      "description": "string",
      "impact": "high|medium|low",
      "effort": "high|medium|low",
      "ddlExample": "string"
    }
  ],
  "summary": "string",
  "quickWins": ["string"]
}`,
      temperature: 0.2,
      maxTokens: 2048,
    });

    const cleaned = result.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
    setCached(key, parsed);
    res.json(parsed);
  } catch (err: unknown) {
    next(err);
  }
});

// ── Query Fingerprinter ───────────────────────────────────────────────────────
const fingerprintSchema = z.object({
  sql: z.string().min(1).max(50000),
});

router.post('/fingerprint', validate(fingerprintSchema), async (req, res, next) => {
  try {
    const { sql } = req.body;

    // Try AST normalization first
    let normalizedSql: string;
    let tables: string[] = [];
    try {
      const ast = sqlParser.astify(sql, { database: 'PostgreSQL' });
      normalizedSql = JSON.stringify(ast);
      const refs = extractRefsFromSQL(sql);
      tables = refs.tables.map(t => t.table);
    } catch {
      // Fallback: regex normalization
      normalizedSql = sql
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/'[^']*'/g, '?')
        .replace(/\b\d+\b/g, '?')
        .trim();
    }

    const fingerprint = crypto.createHash('md5').update(normalizedSql).digest('hex');

    // Find or create in DB
    const existing = await prisma.queryFingerprint.findUnique({ where: { fingerprint } });
    const isNew = !existing;

    if (isNew) {
      await prisma.queryFingerprint.create({
        data: { fingerprint, sql, normalizedSql, tables: JSON.stringify(tables) },
      });
    }

    // Find queries with same tables (similar fingerprints)
    const similarQueries = await prisma.queryFingerprint.findMany({
      where: { fingerprint: { not: fingerprint }, tables: { contains: tables[0] ?? '' } },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const totalSimilar = await prisma.queryFingerprint.count({
      where: { fingerprint: { not: fingerprint }, tables: { contains: tables[0] ?? '' } },
    });

    res.json({
      fingerprint,
      normalizedSql: normalizedSql.slice(0, 500),
      tables,
      isNew,
      similarCount: totalSimilar,
      similarQueries: similarQueries.map(q => ({
        sql: q.sql.slice(0, 200),
        similarity: q.fingerprint === fingerprint ? 'identical' : 'same_tables',
      })),
    });
  } catch (err: unknown) {
    next(err);
  }
});

// ── Assertion Compiler ────────────────────────────────────────────────────────
const assertionsSchema = z.object({
  sql: z.string().min(1).max(50000),
  assertions: z.array(z.string().max(500)).min(1).max(20),
  dialect: z.string().default('postgresql'),
});

router.post('/compile-assertions', validate(assertionsSchema), async (req, res, next) => {
  try {
    const { sql, assertions, dialect } = req.body;
    const key = cacheKey('compile-assertions', sql, (assertions as string[]).join('|'), dialect);
    const cached = getCached(key);
    if (cached) return res.json(cached);

    const result = await generateContent({
      prompt: `You are an expert at translating natural language data quality rules into SQL.

Query:
\`\`\`sql
${sql}
\`\`\`

Natural language assertions to compile:
${(assertions as string[]).map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}

Dialect: ${dialect}

For each assertion generate a SQL CHECK constraint and a test query that returns violations (empty result = passing).

Respond ONLY with valid JSON:
{
  "compiledAssertions": [
    {
      "original": "string",
      "checkConstraint": "string",
      "testQuery": "string",
      "explanation": "string"
    }
  ],
  "testHarness": "string (a single SQL script running all tests with comments)",
  "summary": "string"
}`,
      temperature: 0.2,
      maxTokens: 2048,
    });

    const cleaned = result.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
    setCached(key, parsed);
    res.json(parsed);
  } catch (err: unknown) {
    next(err);
  }
});

// ── Budget Enforcer ───────────────────────────────────────────────────────────
const budgetSchema = z.object({
  sql: z.string().min(1).max(50000),
  maxCostUnits: z.number().min(1).max(1000000),
  schema: z.string().optional(),
  dialect: z.string().default('postgresql'),
});

router.post('/budget-check', validate(budgetSchema), async (req, res, next) => {
  try {
    const { sql, maxCostUnits, schema, dialect } = req.body;
    const key = cacheKey('budget-check', sql, String(maxCostUnits), dialect);
    const cached = getCached(key);
    if (cached) return res.json(cached);

    const result = await generateContent({
      prompt: `You are a database cost estimation expert. Estimate the computational cost of this ${dialect} query and determine if it fits within the budget.

Query:
\`\`\`sql
${sql}
\`\`\`

${schema ? `Schema:\n\`\`\`sql\n${schema}\n\`\`\`` : ''}

Budget: ${maxCostUnits} cost units
Scale: 1 unit = single indexed lookup on 1M rows; full table scan on 1M rows = 1000 units; cartesian join = 1M+ units.

Respond ONLY with valid JSON:
{
  "estimatedCost": number,
  "withinBudget": boolean,
  "breakdown": [
    { "operation": "string", "costUnits": number, "reason": "string" }
  ],
  "optimizations": ["string"],
  "worstCase": number,
  "bestCase": number,
  "verdict": "string"
}`,
      temperature: 0.2,
      maxTokens: 1024,
    });

    const cleaned = result.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
    // Inject withinBudget from actual numbers in case AI gets it wrong
    parsed.withinBudget = (parsed.estimatedCost ?? 0) <= maxCostUnits;
    setCached(key, parsed);
    res.json(parsed);
  } catch (err: unknown) {
    next(err);
  }
});

export default router;
