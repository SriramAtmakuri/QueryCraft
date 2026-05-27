import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../routes/auth';
import historyRoutes from '../routes/history';
import { errorHandler } from '../middleware/errorHandler';

process.env.JWT_SECRET = 'test_secret_for_vitest';
process.env.DATABASE_URL = 'file:./test.db';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use(errorHandler);

const prisma = new PrismaClient();
const testEmail = `hist_${Date.now()}@example.com`;
let accessToken: string;
let historyItemId: string;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: testEmail, password: 'password123', name: 'History Tester' });
  accessToken = res.body.accessToken;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: testEmail } }).catch(() => {});
  await prisma.$disconnect();
});

describe('GET /api/history', () => {
  it('rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/history');
    expect(res.status).toBe(401);
  });

  it('returns empty list for new user', async () => {
    const res = await request(app)
      .get('/api/history')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

describe('POST /api/history', () => {
  it('rejects unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/history')
      .send({ prompt: 'test', sql: 'SELECT 1', dialect: 'postgresql' });
    expect(res.status).toBe(401);
  });

  it('adds history item and returns 201', async () => {
    const res = await request(app)
      .post('/api/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ prompt: 'find all users', sql: 'SELECT * FROM users', dialect: 'postgresql' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.prompt).toBe('find all users');
    historyItemId = res.body.id;
  });

  it('validates required fields', async () => {
    const res = await request(app)
      .post('/api/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ prompt: '' });
    expect(res.status).toBe(400);
  });

  it('item appears in GET after creation', async () => {
    const res = await request(app)
      .get('/api/history')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.items.some((i: { id: string }) => i.id === historyItemId)).toBe(true);
  });
});

describe('GET /api/history pagination', () => {
  it('respects page and limit params', async () => {
    const res = await request(app)
      .get('/api/history?page=1&limit=1')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeLessThanOrEqual(1);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(1);
  });
});

describe('DELETE /api/history/:id', () => {
  it('rejects unauthenticated delete', async () => {
    const res = await request(app).delete(`/api/history/${historyItemId}`);
    expect(res.status).toBe(401);
  });

  it('deletes own history item with 204', async () => {
    const res = await request(app)
      .delete(`/api/history/${historyItemId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for already-deleted item', async () => {
    const res = await request(app)
      .delete(`/api/history/${historyItemId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/history (clear all)', () => {
  it('clears all history for user', async () => {
    // seed two items
    await request(app)
      .post('/api/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ prompt: 'a', sql: 'SELECT 1', dialect: 'mysql' });
    await request(app)
      .post('/api/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ prompt: 'b', sql: 'SELECT 2', dialect: 'sqlite' });

    const clear = await request(app)
      .delete('/api/history')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(clear.status).toBe(204);

    const after = await request(app)
      .get('/api/history')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(after.body.total).toBe(0);
  });
});
