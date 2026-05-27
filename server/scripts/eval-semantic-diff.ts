/**
 * Objective accuracy eval for the semantic-diff endpoint.
 * Runs 10 SQL pair ground-truth cases through the same AI prompt used in
 * production and reports precision, recall, and F1.
 *
 * Run: npx dotenv -e .env -- npx tsx scripts/eval-semantic-diff.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { generateContent } from '../src/aiProvider';

interface EvalCase {
  id: string;
  sql1: string;
  sql2: string;
  dialect: string;
  expected: boolean; // true = equivalent
  note: string;
}

const EVAL_CASES: EvalCase[] = [
  // ── Equivalent pairs ────────────────────────────────────────────────────────
  {
    id: 'eq-1',
    sql1: 'SELECT id FROM users',
    sql2: 'SELECT id FROM users WHERE 1=1',
    dialect: 'postgresql',
    expected: true,
    note: 'Tautological WHERE vs no WHERE',
  },
  {
    id: 'eq-2',
    sql1: "SELECT * FROM orders WHERE amount > 100 AND status = 'active'",
    sql2: "SELECT * FROM orders WHERE status = 'active' AND amount > 100",
    dialect: 'postgresql',
    expected: true,
    note: 'AND predicate commutivity',
  },
  {
    id: 'eq-3',
    sql1: 'SELECT u.id, u.name FROM users u INNER JOIN orders o ON u.id = o.user_id',
    sql2: 'SELECT u.id, u.name FROM users u JOIN orders o ON o.user_id = u.id',
    dialect: 'postgresql',
    expected: true,
    note: 'INNER JOIN == JOIN, ON column order flipped',
  },
  {
    id: 'eq-4',
    sql1: 'SELECT COUNT(*) FROM users WHERE active = true',
    sql2: 'SELECT COUNT(1) FROM users WHERE active = true',
    dialect: 'postgresql',
    expected: true,
    note: 'COUNT(*) vs COUNT(1)',
  },
  {
    id: 'eq-5',
    sql1: 'SELECT DISTINCT email FROM users',
    sql2: 'SELECT email FROM users GROUP BY email',
    dialect: 'postgresql',
    expected: true,
    note: 'DISTINCT vs GROUP BY for deduplication',
  },

  // ── Not-equivalent pairs ─────────────────────────────────────────────────────
  {
    id: 'neq-1',
    sql1: 'SELECT * FROM users WHERE age > 18',
    sql2: 'SELECT * FROM users WHERE age >= 18',
    dialect: 'postgresql',
    expected: false,
    note: 'Boundary difference: > vs >=',
  },
  {
    id: 'neq-2',
    sql1: 'SELECT * FROM orders LEFT JOIN users ON orders.user_id = users.id',
    sql2: 'SELECT * FROM orders INNER JOIN users ON orders.user_id = users.id',
    dialect: 'postgresql',
    expected: false,
    note: 'LEFT JOIN includes unmatched rows; INNER does not',
  },
  {
    id: 'neq-3',
    sql1: 'SELECT id FROM users ORDER BY created_at DESC LIMIT 10',
    sql2: 'SELECT id FROM users ORDER BY created_at ASC LIMIT 10',
    dialect: 'postgresql',
    expected: false,
    note: 'Sort direction flipped — different rows returned',
  },
  {
    id: 'neq-4',
    sql1: "SELECT id FROM users WHERE email LIKE '%@gmail.com'",
    sql2: "SELECT id FROM users WHERE email LIKE '@gmail.com%'",
    dialect: 'postgresql',
    expected: false,
    note: 'LIKE wildcard position differs — different match semantics',
  },
  {
    id: 'neq-5',
    sql1: 'SELECT * FROM users',
    sql2: 'SELECT * FROM users WHERE deleted_at IS NULL',
    dialect: 'postgresql',
    expected: false,
    note: 'Soft-delete filter changes result set',
  },
];

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function runPair(c: EvalCase): Promise<boolean | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await runPairOnce(c);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryMatch = msg.match(/retry in ([\d.]+)s/i);
      if (retryMatch) {
        const waitMs = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 2000;
        process.stdout.write(`[rate limit, waiting ${Math.ceil(waitMs / 1000)}s] `);
        await sleep(waitMs);
      } else {
        process.stderr.write(`\nUnexpected error: ${msg}\n`);
        return null;
      }
    }
  }
  return null;
}

async function runPairOnce(c: EvalCase): Promise<boolean | null> {
  try {
    const result = await generateContent({
      prompt: `You are an expert SQL analyst. Compare these two ${c.dialect} SQL queries and determine if they are semantically equivalent — meaning they return the same results for any given dataset.

Query A:
\`\`\`sql
${c.sql1}
\`\`\`

Query B:
\`\`\`sql
${c.sql2}
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
      maxTokens: 512,
    });

    const cleaned = result.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
    return parsed.isEquivalent === true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Rethrow rate-limit errors so runPair can handle backoff
    if (/quota|rate.?limit|retry in/i.test(msg)) throw err;
    process.stderr.write(`\n  [parse-err] ${msg.slice(0, 120)}\n`);
    return null;
  }
}

async function main() {
  console.log('\n=== Semantic Diff Eval — Ground Truth Benchmark ===\n');
  const providerName = process.env.OLLAMA_MODEL
    ? `local (${process.env.OLLAMA_MODEL})`
    : process.env.GEMINI_API_KEY ? 'cloud (GEMINI_API_KEY)'
    : process.env.OPENAI_API_KEY ? 'cloud (OPENAI_API_KEY)'
    : process.env.ANTHROPIC_API_KEY ? 'cloud (ANTHROPIC_API_KEY)'
    : process.env.GROQ_API_KEY ? 'cloud (GROQ_API_KEY)'
    : 'None configured';
  console.log(`Provider: ${providerName}`);
  console.log(`Cases: ${EVAL_CASES.length} (${EVAL_CASES.filter(c => c.expected).length} equivalent, ${EVAL_CASES.filter(c => !c.expected).length} not-equivalent)\n`);

  const results: { id: string; expected: boolean; predicted: boolean | null; correct: boolean | null }[] = [];

  for (const c of EVAL_CASES) {
    process.stdout.write(`  ${c.id.padEnd(8)} [${c.expected ? 'EQ ' : 'NEQ'}] ${c.note.padEnd(50)} → `);
    const predicted = await runPair(c);
    const correct = predicted !== null ? predicted === c.expected : null;
    results.push({ id: c.id, expected: c.expected, predicted, correct });

    if (correct === null) process.stdout.write('ERROR (parse failed)\n');
    else if (correct) process.stdout.write(`✓ ${String(predicted)}\n`);
    else process.stdout.write(`✗ predicted=${String(predicted)} expected=${String(c.expected)}\n`);

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  // Metrics
  const answered = results.filter(r => r.correct !== null);
  const correct = answered.filter(r => r.correct).length;
  const accuracy = answered.length > 0 ? correct / answered.length : 0;

  // Precision: of predicted-equivalent, how many were actually equivalent?
  const predictedEq = answered.filter(r => r.predicted === true);
  const truePositives = predictedEq.filter(r => r.expected === true).length;
  const precision = predictedEq.length > 0 ? truePositives / predictedEq.length : 0;

  // Recall: of actually-equivalent, how many were correctly predicted?
  const actualEq = answered.filter(r => r.expected === true);
  const recall = actualEq.length > 0 ? truePositives / actualEq.length : 0;

  // F1
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;

  console.log('\n── Results ──────────────────────────────────────────');
  console.log(`  Answered:  ${answered.length}/${results.length}`);
  console.log(`  Accuracy:  ${(accuracy * 100).toFixed(0)}%  (${correct}/${answered.length} correct)`);
  console.log(`  Precision: ${(precision * 100).toFixed(0)}%  (equivalent verdicts correct)`);
  console.log(`  Recall:    ${(recall * 100).toFixed(0)}%  (equivalent cases found)`);
  console.log(`  F1:        ${(f1 * 100).toFixed(0)}%`);
  console.log('─────────────────────────────────────────────────────\n');
}

void main().catch(e => { console.error(e); process.exit(1); });
