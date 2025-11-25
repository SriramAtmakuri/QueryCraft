import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function auditLog(action: string, resource: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    next();
    if (req.user?.userId) {
      prisma.auditLog.create({
        data: {
          action,
          resource,
          ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '',
          userId: req.user.userId
        }
      }).catch(() => {}); // fire-and-forget, never block the request
    }
  };
}
