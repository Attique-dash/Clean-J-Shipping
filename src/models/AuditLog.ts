import { Schema, model, models, Types } from "mongoose";

export interface IAuditLog {
  _id?: string;
  userId: Types.ObjectId;
  userEmail: string;
  action: string; // 'create', 'update', 'delete', 'view'
  resource: string; // 'customer', 'package', 'staff', etc.
  resourceId: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String, required: true },
  action: { type: String, required: true, index: true },
  resource: { type: String, required: true, index: true },
  resourceId: { type: String, required: true },
  changes: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
});

AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });

export const AuditLog = models.AuditLog || model<IAuditLog>("AuditLog", AuditLogSchema);
