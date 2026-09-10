/**
 * Audit logger — server-side only.
 * Uses Winston for structured logging.
 * All important system actions are recorded to both console and the AuditLog DB table.
 */

import winston from 'winston'
import type { AuditAction, Prisma } from '@prisma/client'

const winstonLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'veriQO' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
})

interface AuditParams {
  userId?: string
  action: AuditAction
  entityType?: string
  entityId?: string
  metadata?: Prisma.InputJsonValue
  ipAddress?: string
}

/**
 * Write an audit log entry.
 * Logs to Winston (console/file) AND persists to DB AuditLog table.
 * Import prisma lazily to avoid circular deps.
 */
export async function audit(params: AuditParams): Promise<void> {
  winstonLogger.info('AUDIT', { ...params })

  try {
    // Dynamic import to avoid module-load-order issues
    const { prisma } = await import('@/lib/prisma')
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata: params.metadata ?? {},
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch (err) {
    // Log failure must not crash the request
    winstonLogger.error('Failed to persist audit log to DB', { err, params })
  }
}

export const logger = winstonLogger
