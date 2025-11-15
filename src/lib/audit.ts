import { AuditLog } from '@/models/AuditLog';
import { Types } from 'mongoose';

export async function logAudit(params: {
  userId: string;
  userEmail: string;
  action: 'create' | 'update' | 'delete' | 'view';
  resource: string;
  resourceId: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  req?: Request;
}) {
  try {
    const ipAddress = params.req?.headers.get('x-forwarded-for') || params.req?.headers.get('x-real-ip');
    const userAgent = params.req?.headers.get('user-agent');

    const userId = Types.ObjectId.isValid(params.userId) ? new Types.ObjectId(params.userId) : undefined;
    if (!userId) {
      throw new Error('Invalid userId for audit log');
    }
    await AuditLog.create({
      userId,
      userEmail: params.userEmail,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      changes: params.changes,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[AuditLog] Failed to create log:', error);
    // Non-blocking
  }
}
