import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional()
});

const forgotPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8)
});

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function signAccess(userId: string, email: string) {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
}

async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(64).toString('hex');
  await prisma.refreshToken.create({
    data: { token, userId, expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS) }
  });
  return token;
}

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true, theme: true, createdAt: true }
    });

    const accessToken = signAccess(user.id, user.email);
    const refreshToken = await createRefreshToken(user.id);
    res.status(201).json({ accessToken, refreshToken, user });
  } catch (err) { next(err); }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) throw new AppError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    const accessToken = signAccess(user.id, user.email);
    const refreshToken = await createRefreshToken(user.id);
    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, theme: user.theme, createdAt: user.createdAt }
    });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError(400, 'Refresh token required');

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken }, include: { user: true } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    const newRefreshToken = await createRefreshToken(stored.userId);
    const accessToken = signAccess(stored.userId, stored.user.email);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) { next(err); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true }
      });
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, theme: true, createdAt: true }
    });
    if (!user) throw new AppError(404, 'User not found');
    res.json({ user });
  } catch (err) { next(err); }
});

router.patch('/me', requireAuth, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const { name, currentPassword, newPassword, theme } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError(404, 'User not found');

    if (newPassword) {
      if (!currentPassword) throw new AppError(400, 'Current password required to set new password');
      const valid = user.passwordHash ? await bcrypt.compare(currentPassword, user.passwordHash) : false;
      if (!valid) throw new AppError(401, 'Current password incorrect');
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(theme && { theme }),
        ...(newPassword && { passwordHash: await bcrypt.hash(newPassword, 12) })
      },
      select: { id: true, email: true, name: true, theme: true, createdAt: true }
    });
    res.json({ user: updated });
  } catch (err) { next(err); }
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent' });

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } // 1hr
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    if (resend) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@querycraft.app',
        to: email,
        subject: 'Reset your QueryCraft password',
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.</p>`
      });
    }

    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (err) { next(err); }
});

router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const reset = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!reset || reset.used || reset.expiresAt < new Date()) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { used: true } }),
      prisma.refreshToken.updateMany({ where: { userId: reset.userId }, data: { revoked: true } })
    ]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) { next(err); }
});

export default router;
