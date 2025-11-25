import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const addHistorySchema = z.object({
  prompt: z.string().min(1).max(2000),
  sql: z.string().min(1).max(50000),
  dialect: z.string().default('postgresql')
});

const saveQuerySchema = z.object({
  name: z.string().min(1).max(200),
  sqlQuery: z.string().min(1).max(50000),
  visualizationConfig: z.string().optional()
});

router.use(requireAuth);

// Query history
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.queryHistory.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.queryHistory.count({ where: { userId: req.user!.userId } })
    ]);

    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(addHistorySchema), async (req, res, next) => {
  try {
    const item = await prisma.queryHistory.create({
      data: { ...req.body, userId: req.user!.userId }
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const item = await prisma.queryHistory.findUnique({ where: { id: req.params.id } });
    if (!item) throw new AppError(404, 'History item not found');
    if (item.userId !== req.user!.userId) throw new AppError(403, 'Forbidden');

    await prisma.queryHistory.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.delete('/', async (req, res, next) => {
  try {
    await prisma.queryHistory.deleteMany({ where: { userId: req.user!.userId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Saved queries
router.get('/saved', async (req, res, next) => {
  try {
    const queries = await prisma.savedQuery.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(queries);
  } catch (err) {
    next(err);
  }
});

router.post('/saved', validate(saveQuerySchema), async (req, res, next) => {
  try {
    const query = await prisma.savedQuery.create({
      data: { ...req.body, userId: req.user!.userId }
    });
    res.status(201).json(query);
  } catch (err) {
    next(err);
  }
});

router.put('/saved/:id', validate(saveQuerySchema), async (req, res, next) => {
  try {
    const existing = await prisma.savedQuery.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Query not found');
    if (existing.userId !== req.user!.userId) throw new AppError(403, 'Forbidden');

    const query = await prisma.savedQuery.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(query);
  } catch (err) {
    next(err);
  }
});

router.delete('/saved/:id', async (req, res, next) => {
  try {
    const existing = await prisma.savedQuery.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Query not found');
    if (existing.userId !== req.user!.userId) throw new AppError(403, 'Forbidden');

    await prisma.savedQuery.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
