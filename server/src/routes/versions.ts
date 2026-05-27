import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { generateContent } from '../aiProvider';
import { validate } from '../middleware/validate';
import { getCached, setCached, cacheKey } from '../cache';

const prisma = new PrismaClient();
const router = Router();

const saveVersionSchema = z.object({
  queryName: z.string().min(1).max(200),
  sql: z.string().min(1).max(50000),
  note: z.string().max(500).optional(),
  userId: z.string().optional(),
});

const diffVersionsSchema = z.object({
  sql1: z.string().min(1).max(50000),
  sql2: z.string().min(1).max(50000),
  dialect: z.string().default('postgresql'),
  label1: z.string().max(100).optional(),
  label2: z.string().max(100).optional(),
});

router.post('/', validate(saveVersionSchema), async (req, res, next) => {
  try {
    const { queryName, sql, note, userId } = req.body;
    const latest = await prisma.queryVersion.findFirst({
      where: { queryName },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? 0) + 1;
    const saved = await prisma.queryVersion.create({
      data: { queryName, sql, note, userId, version },
    });
    res.status(201).json(saved);
  } catch (err: unknown) {
    next(err);
  }
});

router.get('/:queryName', async (req, res, next) => {
  try {
    const { queryName } = req.params;
    const versions = await prisma.queryVersion.findMany({
      where: { queryName },
      orderBy: { version: 'desc' },
      take: 50,
    });
    res.json({ queryName, versions });
  } catch (err: unknown) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.queryVersion.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: unknown) {
    next(err);
  }
});

router.post('/diff', validate(diffVersionsSchema), async (req, res, next) => {
  try {
    const { sql1, sql2, dialect, label1 = 'Version A', label2 = 'Version B' } = req.body;
    const key = cacheKey('version-diff', sql1, sql2, dialect);
    const cached = getCached(key);
    if (cached) return res.json(cached);

    const result = await generateContent({
      prompt: `You are a SQL change analyst. Describe the changes between two versions of a SQL query in human-readable language, as if writing a git commit message or changelog entry.

${label1}:
\`\`\`sql
${sql1}
\`\`\`

${label2}:
\`\`\`sql
${sql2}
\`\`\`

Dialect: ${dialect}

Respond ONLY with valid JSON:
{
  "changelog": "string (human-readable description of what changed, 1-3 sentences)",
  "changes": [
    { "category": "filter|join|column|table|order|group|limit|other", "description": "string", "impact": "breaking|behavioral|cosmetic" }
  ],
  "breakingChanges": ["string"],
  "summary": "string",
  "semverBump": "major|minor|patch"
}`,
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

export default router;
