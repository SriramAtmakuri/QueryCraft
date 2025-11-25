import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const createShareSchema = z.object({
  query: z.string().max(5000).optional(),
  sql: z.string().min(1).max(50000),
  dialect: z.string().default('postgresql'),
  schema: z.string().max(100000).optional(),
});

const addCommentSchema = z.object({
  lineStart: z.number().int().min(1),
  lineEnd: z.number().int().min(1),
  comment: z.string().min(1).max(2000),
  author: z.string().max(100).default('Anonymous'),
});

// Create a persistent shared query and get back a shareId
router.post('/share', validate(createShareSchema), async (req, res, next) => {
  try {
    const shared = await prisma.sharedQuery.create({
      data: req.body,
    });
    res.status(201).json({ shareId: shared.id, createdAt: shared.createdAt });
  } catch (err: unknown) {
    next(err);
  }
});

// Get shared query by shareId
router.get('/share/:shareId', async (req, res, next) => {
  try {
    const shared = await prisma.sharedQuery.findUnique({
      where: { id: req.params.shareId },
      include: {
        reviews: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!shared) throw new AppError(404, 'Shared query not found');
    res.json(shared);
  } catch (err: unknown) {
    next(err);
  }
});

// Get all review comments for a shareId
router.get('/:shareId', async (req, res, next) => {
  try {
    const shared = await prisma.sharedQuery.findUnique({ where: { id: req.params.shareId } });
    if (!shared) throw new AppError(404, 'Shared query not found');

    const reviews = await prisma.queryReview.findMany({
      where: { shareId: req.params.shareId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(reviews);
  } catch (err: unknown) {
    next(err);
  }
});

// Add a review comment
router.post('/:shareId', validate(addCommentSchema), async (req, res, next) => {
  try {
    const shared = await prisma.sharedQuery.findUnique({ where: { id: req.params.shareId } });
    if (!shared) throw new AppError(404, 'Shared query not found');

    const review = await prisma.queryReview.create({
      data: {
        ...req.body,
        shareId: req.params.shareId,
      },
    });
    res.status(201).json(review);
  } catch (err: unknown) {
    next(err);
  }
});

// Delete a review comment
router.delete('/comments/:commentId', async (req, res, next) => {
  try {
    const review = await prisma.queryReview.findUnique({ where: { id: req.params.commentId } });
    if (!review) throw new AppError(404, 'Comment not found');
    await prisma.queryReview.delete({ where: { id: req.params.commentId } });
    res.status(204).send();
  } catch (err: unknown) {
    next(err);
  }
});

export default router;
