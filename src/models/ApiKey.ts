import { Schema, model, models } from "mongoose";
import crypto from "crypto";

export interface IApiKey {
  _id?: string;
  key: string; // hashed
  keyPrefix: string; // first 12 chars for display
  name: string;
  permissions: string[];
  active: boolean;
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
}

const ApiKeySchema = new Schema<IApiKey>({
  key: { type: String, required: true, unique: true, index: true },
  keyPrefix: { type: String, required: true },
  name: { type: String, required: true },
  permissions: [{ type: String }],
  active: { type: Boolean, default: true, index: true },
  expiresAt: { type: Date, index: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date },
  usageCount: { type: Number, default: 0 },
});

ApiKeySchema.index({ active: 1, expiresAt: 1 });

export const ApiKey = models.ApiKey || model<IApiKey>("ApiKey", ApiKeySchema);

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const randomBytes = crypto.randomBytes(24);
  const key = `wh_live_${randomBytes.toString('base64url')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 12);
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
