import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { validate } from '../middleware/validate';

const router = Router();
const prisma = new PrismaClient();

const feedbackSchema = z.object({
  feature: z.enum(['semantic-diff', 'schema-drift', 'infer-migrations', 'dialect-cost', 'explain', 'optimize', 'debug', 'generate']),
  rating: z.union([z.literal(1), z.literal(-1)]),
  inputSummary: z.string().max(500).optional(),
  outputSummary: z.string().max(500).optional(),
});

router.post('/', validate(feedbackSchema), async (req, res, next) => {
  try {
    const record = await prisma.aIFeedback.create({ data: req.body });
    res.status(201).json({ id: record.id });
  } catch (err) { next(err); }
});

// Aggregate stats per feature (internal analytics)
router.get('/stats', async (_req, res, next) => {
  try {
    const rows = await prisma.aIFeedback.groupBy({
      by: ['feature'],
      _count: { id: true },
      _sum: { rating: true },
    });
    const stats = rows.map(r => ({
      feature: r.feature,
      total: r._count.id,
      score: r._sum.rating ?? 0,
      positiveRate: r._count.id > 0
        ? `${Math.round(((r._sum.rating ?? 0) + r._count.id) / 2 / r._count.id * 100)}%`
        : '—',
    }));
    res.json(stats);
  } catch (err) { next(err); }
});

export default router;
