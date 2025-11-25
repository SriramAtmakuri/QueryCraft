import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { auditLog } from '../middleware/audit';
import { logger } from '../logger';

const router = Router();
const prisma = new PrismaClient();

const connectSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['postgresql', 'mysql', 'sqlite']),
  connectionString: z.string().min(1).max(500)
});

const executeSchema = z.object({
  connectionId: z.string().uuid(),
  sql: z.string().min(1).max(10000)
});

// Whitelist read-only SQL operations only
const ALLOWED_STATEMENTS = /^\s*(SELECT|EXPLAIN|SHOW|DESCRIBE|WITH|PRAGMA)\b/i;
const FORBIDDEN_PATTERNS = /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|EXEC|EXECUTE|xp_|sp_)\b/i;

function validateReadOnly(sql: string): void {
  if (!ALLOWED_STATEMENTS.test(sql)) {
    throw new AppError(400, 'Only SELECT, EXPLAIN, SHOW, DESCRIBE, and WITH queries are allowed');
  }
  if (FORBIDDEN_PATTERNS.test(sql)) {
    throw new AppError(400, 'Query contains forbidden operations');
  }
}

async function executePostgres(connectionString: string, sql: string): Promise<{ columns: string[]; rows: unknown[][] }> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new AppError(408, 'Query timeout (30s)')), 30000)
    );
    const result = await Promise.race([client.query(sql), timeout]);
    return {
      columns: result.fields.map((f: { name: string }) => f.name),
      rows: result.rows.map((r: Record<string, unknown>) => result.fields.map((f: { name: string }) => r[f.name]))
    };
  } finally {
    await client.end().catch(() => {});
  }
}

async function executeMySQL(connectionString: string, sql: string): Promise<{ columns: string[]; rows: unknown[][] }> {
  const mysql = await import('mysql2/promise');
  const conn = await mysql.createConnection(connectionString);
  try {
    const [rows, fields] = await Promise.race([
      conn.execute(sql),
      new Promise<never>((_, reject) => setTimeout(() => reject(new AppError(408, 'Query timeout (30s)')), 30000))
    ]) as Awaited<ReturnType<typeof conn.execute>>;
    const cols = (fields as { name: string }[]).map(f => f.name);
    return { columns: cols, rows: (rows as unknown[][]).map(r => cols.map((_, i) => (r as unknown[])[i])) };
  } finally {
    await conn.end().catch(() => {});
  }
}

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const connections = await prisma.databaseConnection.findMany({
      where: { userId: req.user!.userId },
      select: { id: true, name: true, type: true, createdAt: true, updatedAt: true }
    });
    res.json(connections);
  } catch (err) { next(err); }
});

router.post('/', validate(connectSchema), auditLog('db.connect', 'database'), async (req, res, next) => {
  try {
    const { name, type, connectionString } = req.body;

    // Test connection before saving
    try {
      if (type === 'postgresql') await executePostgres(connectionString, 'SELECT 1');
      else if (type === 'mysql') await executeMySQL(connectionString, 'SELECT 1');
    } catch {
      throw new AppError(400, `Cannot connect to ${type} database. Check connection string.`);
    }

    const conn = await prisma.databaseConnection.create({
      data: { name, type, connectionString, userId: req.user!.userId },
      select: { id: true, name: true, type: true, createdAt: true }
    });
    res.status(201).json(conn);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const conn = await prisma.databaseConnection.findUnique({ where: { id: req.params.id } });
    if (!conn) throw new AppError(404, 'Connection not found');
    if (conn.userId !== req.user!.userId) throw new AppError(403, 'Forbidden');
    await prisma.databaseConnection.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/execute', validate(executeSchema), auditLog('db.execute', 'query'), async (req, res, next) => {
  try {
    const { connectionId, sql } = req.body;

    validateReadOnly(sql);

    const conn = await prisma.databaseConnection.findUnique({ where: { id: connectionId } });
    if (!conn) throw new AppError(404, 'Connection not found');
    if (conn.userId !== req.user!.userId) throw new AppError(403, 'Forbidden');

    logger.info({ userId: req.user!.userId, connectionId, type: conn.type }, 'Executing query');

    let result: { columns: string[]; rows: unknown[][] };
    if (conn.type === 'postgresql') {
      result = await executePostgres(conn.connectionString, sql);
    } else if (conn.type === 'mysql') {
      result = await executeMySQL(conn.connectionString, sql);
    } else {
      throw new AppError(400, 'Unsupported database type for execution');
    }

    res.json({ columns: result.columns, rows: result.rows, rowCount: result.rows.length });
  } catch (err) { next(err); }
});

router.post('/explain', validate(executeSchema), async (req, res, next) => {
  try {
    const { connectionId, sql } = req.body;

    validateReadOnly(sql);

    const conn = await prisma.databaseConnection.findUnique({ where: { id: connectionId } });
    if (!conn) throw new AppError(404, 'Connection not found');
    if (conn.userId !== req.user!.userId) throw new AppError(403, 'Forbidden');

    const explainSql = conn.type === 'postgresql' ? `EXPLAIN ANALYZE ${sql}` : `EXPLAIN ${sql}`;
    let result: { columns: string[]; rows: unknown[][] };

    if (conn.type === 'postgresql') result = await executePostgres(conn.connectionString, explainSql);
    else if (conn.type === 'mysql') result = await executeMySQL(conn.connectionString, explainSql);
    else throw new AppError(400, 'Unsupported database type');

    res.json({ plan: result.rows.map(r => r[0]).join('\n'), raw: result });
  } catch (err) { next(err); }
});

export default router;
