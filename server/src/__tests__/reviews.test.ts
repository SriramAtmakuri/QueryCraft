import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import reviewRoutes from '../routes/reviews';
import { errorHandler } from '../middleware/errorHandler';

process.env.JWT_SECRET = 'test_secret_for_vitest';
process.env.DATABASE_URL = 'file:./test.db';

const app = express();
app.use(express.json());
app.use('/api/reviews', reviewRoutes);
app.use(errorHandler);

const prisma = new PrismaClient();
let shareId: string;
let commentId: string;

afterAll(async () => {
  await prisma.sharedQuery.deleteMany({ where: { sql: { startsWith: 'SELECT /* test-reviews */' } } }).catch(() => {});
  await prisma.$disconnect();
});

describe('POST /api/reviews/share', () => {
  it('creates shared query and returns shareId', async () => {
    const res = await request(app)
      .post('/api/reviews/share')
      .send({ sql: 'SELECT /* test-reviews */ * FROM users', dialect: 'postgresql', query: 'find all users' });
    expect(res.status).toBe(201);
    expect(res.body.shareId).toBeTruthy();
    shareId = res.body.shareId;
  });

  it('rejects missing sql', async () => {
    const res = await request(app)
      .post('/api/reviews/share')
      .send({ dialect: 'postgresql' });
    expect(res.status).toBe(400);
  });

  it('accepts optional fields', async () => {
    const res = await request(app)
      .post('/api/reviews/share')
      .send({
        sql: 'SELECT /* test-reviews */ 1',
        dialect: 'mysql',
        schema: 'CREATE TABLE users (id INT PRIMARY KEY)',
      });
    expect(res.status).toBe(201);
    expect(res.body.shareId).toBeTruthy();
  });
});

describe('GET /api/reviews/share/:shareId', () => {
  it('returns shared query with reviews array', async () => {
    const res = await request(app).get(`/api/reviews/share/${shareId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(shareId);
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });

  it('returns 404 for unknown shareId', async () => {
    const res = await request(app).get('/api/reviews/share/nonexistent-id-xyz');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/reviews/:shareId', () => {
  it('returns empty array before any comments', async () => {
    const res = await request(app).get(`/api/reviews/${shareId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 404 for unknown shareId', async () => {
    const res = await request(app).get('/api/reviews/nonexistent-id-xyz');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/reviews/:shareId (add comment)', () => {
  it('adds comment and returns 201', async () => {
    const res = await request(app)
      .post(`/api/reviews/${shareId}`)
      .send({ lineStart: 1, lineEnd: 1, comment: 'Consider using a JOIN instead', author: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.comment).toBe('Consider using a JOIN instead');
    commentId = res.body.id;
  });

  it('uses Anonymous as default author', async () => {
    const res = await request(app)
      .post(`/api/reviews/${shareId}`)
      .send({ lineStart: 2, lineEnd: 3, comment: 'Missing index on user_id' });
    expect(res.status).toBe(201);
    expect(res.body.author).toBe('Anonymous');
  });

  it('rejects empty comment', async () => {
    const res = await request(app)
      .post(`/api/reviews/${shareId}`)
      .send({ lineStart: 1, lineEnd: 1, comment: '' });
    expect(res.status).toBe(400);
  });

  it('rejects missing lineStart', async () => {
    const res = await request(app)
      .post(`/api/reviews/${shareId}`)
      .send({ lineEnd: 1, comment: 'Missing lineStart' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown shareId', async () => {
    const res = await request(app)
      .post('/api/reviews/nonexistent-id-xyz')
      .send({ lineStart: 1, lineEnd: 1, comment: 'should fail' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/reviews/:shareId after comments', () => {
  it('returns comments after adding them', async () => {
    const res = await request(app).get(`/api/reviews/${shareId}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body.some((r: { id: string }) => r.id === commentId)).toBe(true);
  });
});

describe('DELETE /api/reviews/comments/:commentId', () => {
  it('deletes comment with 204', async () => {
    const res = await request(app).delete(`/api/reviews/comments/${commentId}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for already-deleted comment', async () => {
    const res = await request(app).delete(`/api/reviews/comments/${commentId}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for nonexistent comment', async () => {
    const res = await request(app).delete('/api/reviews/comments/nonexistent-id-xyz');
    expect(res.status).toBe(404);
  });
});

describe('cascade delete on shared query', () => {
  it('deleting shared query removes reviews via cascade', async () => {
    const shareRes = await request(app)
      .post('/api/reviews/share')
      .send({ sql: 'SELECT /* test-reviews */ 99' });
    const sid = shareRes.body.shareId;

    await request(app)
      .post(`/api/reviews/${sid}`)
      .send({ lineStart: 1, lineEnd: 1, comment: 'cascade test comment' });

    await prisma.sharedQuery.delete({ where: { id: sid } });

    const orphans = await prisma.queryReview.findMany({ where: { shareId: sid } });
    expect(orphans.length).toBe(0);
  });
});
