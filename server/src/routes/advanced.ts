import { Router } from 'express';
import { z } from 'zod';
import { generateContent } from '../aiProvider';
import { validate } from '../middleware/validate';
import { getCached, setCached, cacheKey } from '../cache';

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

    const sampleQueries = queries.slice(0, 30).join('\n-- next query --\n');

    const result = await generateContent({
      prompt: `You are a database performance expert. Analyze this ${dialect} schema and query history to detect schema drift — tables and columns that are never queried (candidates for removal or archival), hot spots, and missing indexes.

Schema:
\`\`\`sql
${schema}
\`\`\`

Query history (${queries.length} queries sampled):
\`\`\`sql
${sampleQueries}
\`\`\`

Identify: unused tables, unused columns, heavily-queried tables (hot paths), columns frequently used in WHERE/JOIN that lack indexes.

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

    const sampleQueries = queries.slice(0, 30).join('\n-- next query --\n');

    const result = await generateContent({
      prompt: `You are a senior database architect. Analyze this ${dialect} schema and query patterns to infer what database migrations would improve the schema — add missing indexes, foreign keys, constraints, or new columns that queries imply should exist.

Current schema:
\`\`\`sql
${schema}
\`\`\`

Query patterns (${queries.length} queries):
\`\`\`sql
${sampleQueries}
\`\`\`

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

export default router;
