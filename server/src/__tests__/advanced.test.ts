import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/errorHandler';

process.env.JWT_SECRET = 'test_secret_for_vitest';
process.env.DATABASE_URL = 'file:./test.db';

// Mock AI provider before importing routes that use it
vi.mock('../aiProvider', () => ({
  generateContent: vi.fn(),
  extractJSON: vi.fn(),
  extractJSONObject: vi.fn(),
  extractJSONArray: vi.fn(),
  getAvailableProvider: vi.fn(() => null),
}));

// Mock cache so tests are isolated
vi.mock('../cache', () => ({
  getCached: vi.fn(() => null),
  setCached: vi.fn(),
  cacheKey: (...args: string[]) => args.join(':'),
  getCacheStats: vi.fn(() => ({ size: 0 })),
}));

import advancedRoutes from '../routes/advanced';
import { generateContent } from '../aiProvider';

const mockGenerate = generateContent as ReturnType<typeof vi.fn>;

const app = express();
app.use(express.json());
app.use('/api/advanced', advancedRoutes);
app.use(errorHandler);

function mockResponse(json: unknown) {
  mockGenerate.mockResolvedValueOnce({ text: JSON.stringify(json) });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Semantic Diff ──────────────────────────────────────────────────────────────

describe('POST /api/advanced/semantic-diff', () => {
  const semanticResult = {
    isEquivalent: true,
    confidence: 'high',
    summary: 'Both queries return the same rows',
    differences: [],
    edgeCases: ['Empty table returns empty set for both'],
    recommendation: 'Prefer Query A for readability',
  };

  it('returns semantic analysis for two equivalent queries', async () => {
    mockResponse(semanticResult);
    const res = await request(app)
      .post('/api/advanced/semantic-diff')
      .send({ sql1: 'SELECT id FROM users', sql2: 'SELECT id FROM users WHERE 1=1', dialect: 'postgresql' });
    expect(res.status).toBe(200);
    expect(res.body.isEquivalent).toBe(true);
    expect(res.body.confidence).toBe('high');
    expect(Array.isArray(res.body.differences)).toBe(true);
  });

  it('returns non-equivalent result with differences', async () => {
    const diffResult = {
      isEquivalent: false,
      confidence: 'high',
      summary: 'Query B filters active users',
      differences: [{ type: 'filter', description: 'WHERE active=true', impact: 'high' }],
      edgeCases: [],
      recommendation: 'Use Query B if only active users needed',
    };
    mockResponse(diffResult);
    const res = await request(app)
      .post('/api/advanced/semantic-diff')
      .send({ sql1: 'SELECT id FROM users', sql2: "SELECT id FROM users WHERE active=true", dialect: 'postgresql' });
    expect(res.status).toBe(200);
    expect(res.body.isEquivalent).toBe(false);
    expect(res.body.differences.length).toBeGreaterThan(0);
  });

  it('rejects empty sql1', async () => {
    const res = await request(app)
      .post('/api/advanced/semantic-diff')
      .send({ sql1: '', sql2: 'SELECT 1', dialect: 'postgresql' });
    expect(res.status).toBe(400);
  });

  it('rejects missing sql2', async () => {
    const res = await request(app)
      .post('/api/advanced/semantic-diff')
      .send({ sql1: 'SELECT 1', dialect: 'postgresql' });
    expect(res.status).toBe(400);
  });

  it('returns 500 if AI returns no JSON', async () => {
    mockGenerate.mockResolvedValueOnce({ text: 'Sorry, I cannot help with that.' });
    const res = await request(app)
      .post('/api/advanced/semantic-diff')
      .send({ sql1: 'SELECT 1', sql2: 'SELECT 2', dialect: 'postgresql' });
    expect(res.status).toBe(500);
  });
});

// ── Schema Drift ───────────────────────────────────────────────────────────────

describe('POST /api/advanced/schema-drift', () => {
  const driftResult = {
    unusedTables: [{ table: 'audit_log', confidence: 'high', suggestion: 'Archive or drop' }],
    unusedColumns: [{ table: 'users', column: 'legacy_id', suggestion: 'Remove' }],
    hotTables: [{ table: 'orders', queryCount: 45, insight: 'Heavily queried' }],
    indexSuggestions: [
      { table: 'orders', columns: ['user_id'], reason: 'Frequent join target', sql: 'CREATE INDEX idx_orders_user_id ON orders(user_id)', impact: 'high' },
    ],
    summary: 'Schema has 1 unused table and 1 missing index',
  };

  const testSchema = 'CREATE TABLE users (id INT, legacy_id INT); CREATE TABLE orders (id INT, user_id INT); CREATE TABLE audit_log (id INT);';
  const testQueries = ['SELECT * FROM users', 'SELECT * FROM orders WHERE user_id = 1'];

  it('returns drift analysis', async () => {
    mockResponse(driftResult);
    const res = await request(app)
      .post('/api/advanced/schema-drift')
      .send({ schema: testSchema, queries: testQueries, dialect: 'postgresql' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.unusedTables)).toBe(true);
    expect(Array.isArray(res.body.indexSuggestions)).toBe(true);
    expect(res.body.hotTables.length).toBeGreaterThan(0);
  });

  it('rejects missing schema', async () => {
    const res = await request(app)
      .post('/api/advanced/schema-drift')
      .send({ queries: testQueries });
    expect(res.status).toBe(400);
  });

  it('rejects empty queries array', async () => {
    const res = await request(app)
      .post('/api/advanced/schema-drift')
      .send({ schema: testSchema, queries: [] });
    expect(res.status).toBe(400);
  });

  it('uses postgresql as default dialect', async () => {
    mockResponse(driftResult);
    const res = await request(app)
      .post('/api/advanced/schema-drift')
      .send({ schema: testSchema, queries: testQueries });
    expect(res.status).toBe(200);
  });
});

// ── Infer Migrations ───────────────────────────────────────────────────────────

describe('POST /api/advanced/infer-migrations', () => {
  const migrationsResult = {
    migrations: [
      {
        description: 'Add index on orders.user_id',
        type: 'add_index',
        sql: 'CREATE INDEX idx_orders_user_id ON orders(user_id)',
        risk: 'low',
        reason: 'Frequent JOIN pattern detected',
        reverseSql: 'DROP INDEX idx_orders_user_id',
      },
    ],
    summary: '1 migration recommended',
  };

  const testSchema = 'CREATE TABLE orders (id INT, user_id INT, total DECIMAL);';
  const testQueries = [
    'SELECT * FROM orders WHERE user_id = 1',
    'SELECT o.*, u.name FROM orders o JOIN users u ON u.id = o.user_id',
  ];

  it('returns migration recommendations', async () => {
    mockResponse(migrationsResult);
    const res = await request(app)
      .post('/api/advanced/infer-migrations')
      .send({ schema: testSchema, queries: testQueries, dialect: 'postgresql' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.migrations)).toBe(true);
    expect(res.body.migrations[0]).toHaveProperty('sql');
    expect(res.body.migrations[0]).toHaveProperty('reverseSql');
    expect(res.body.migrations[0]).toHaveProperty('risk');
  });

  it('rejects missing queries', async () => {
    const res = await request(app)
      .post('/api/advanced/infer-migrations')
      .send({ schema: testSchema });
    expect(res.status).toBe(400);
  });

  it('accepts up to 100 queries', async () => {
    mockResponse(migrationsResult);
    const queries = Array.from({ length: 50 }, (_, i) => `SELECT ${i} FROM orders`);
    const res = await request(app)
      .post('/api/advanced/infer-migrations')
      .send({ schema: testSchema, queries });
    expect(res.status).toBe(200);
  });
});

// ── Dialect Cost ───────────────────────────────────────────────────────────────

describe('POST /api/advanced/dialect-cost', () => {
  const costResult = {
    analyses: [
      { dialect: 'postgresql', complexity: 'medium', scanComplexity: 'O(log n)', bottlenecks: ['seq scan on orders'], optimizations: ['Add index'], dialectSpecificNotes: ['Supports parallel query'], relativeScore: 2 },
      { dialect: 'mysql', complexity: 'medium', scanComplexity: 'O(n)', bottlenecks: ['full table scan'], optimizations: ['Add covering index'], dialectSpecificNotes: ['No parallel query in InnoDB'], relativeScore: 5 },
    ],
    fastestDialect: 'postgresql',
    summary: 'PostgreSQL handles this query most efficiently',
    portabilityWarnings: ['NOW() behaves differently in MySQL'],
  };

  const testSql = 'SELECT u.*, COUNT(o.id) FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id';

  it('returns cost analysis for multiple dialects', async () => {
    mockResponse(costResult);
    const res = await request(app)
      .post('/api/advanced/dialect-cost')
      .send({ sql: testSql, dialects: ['postgresql', 'mysql'] });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.analyses)).toBe(true);
    expect(res.body.fastestDialect).toBeTruthy();
    expect(Array.isArray(res.body.portabilityWarnings)).toBe(true);
  });

  it('each analysis has required fields', async () => {
    mockResponse(costResult);
    const res = await request(app)
      .post('/api/advanced/dialect-cost')
      .send({ sql: testSql, dialects: ['postgresql', 'mysql'] });
    expect(res.status).toBe(200);
    for (const analysis of res.body.analyses) {
      expect(analysis).toHaveProperty('dialect');
      expect(analysis).toHaveProperty('complexity');
      expect(analysis).toHaveProperty('relativeScore');
      expect(analysis).toHaveProperty('bottlenecks');
    }
  });

  it('rejects empty sql', async () => {
    const res = await request(app)
      .post('/api/advanced/dialect-cost')
      .send({ sql: '', dialects: ['postgresql'] });
    expect(res.status).toBe(400);
  });

  it('rejects invalid dialect enum', async () => {
    const res = await request(app)
      .post('/api/advanced/dialect-cost')
      .send({ sql: testSql, dialects: ['oracle'] });
    expect(res.status).toBe(400);
  });

  it('rejects empty dialects array', async () => {
    const res = await request(app)
      .post('/api/advanced/dialect-cost')
      .send({ sql: testSql, dialects: [] });
    expect(res.status).toBe(400);
  });

  it('accepts optional schema context', async () => {
    mockResponse(costResult);
    const res = await request(app)
      .post('/api/advanced/dialect-cost')
      .send({
        sql: testSql,
        dialects: ['postgresql'],
        schema: 'CREATE TABLE users (id INT PRIMARY KEY); CREATE TABLE orders (id INT, user_id INT);',
      });
    expect(res.status).toBe(200);
  });
});
