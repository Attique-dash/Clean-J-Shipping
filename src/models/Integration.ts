import { Schema, model, models } from "mongoose";

export interface IIntegration {
  _id?: string;
  name: string; // Integration name (e.g., 'PayPal', 'FedEx')
  type: string; // 'payment_gateway', 'shipping_carrier', 'other'
  provider: string; // Provider identifier
  isActive: boolean;
  config: Record<string, unknown>; // Configuration data (API keys, endpoints, etc.)
  credentials?: Record<string, unknown>; // Encrypted credentials
  webhookUrl?: string;
  webhookSecret?: string;
  testMode?: boolean;
  metadata?: Record<string, unknown>;
  lastSyncAt?: Date;
  syncStatus?: string; // 'success', 'failed', 'pending'
  errorMessage?: string;
  createdBy?: string; // Admin ID who created
  updatedBy?: string; // Admin ID who last updated
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>({
  name: { type: String, required: true },
  type: { type: String, required: true, index: true },
  provider: { type: String, required: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  config: { type: Schema.Types.Mixed, default: {} },
  credentials: { type: Schema.Types.Mixed },
  webhookUrl: { type: String },
  webhookSecret: { type: String },
  testMode: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed },
  lastSyncAt: { type: Date },
  syncStatus: { type: String },
  errorMessage: { type: String },
  createdBy: { type: String },
  updatedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

IntegrationSchema.index({ type: 1, isActive: 1 });
IntegrationSchema.index({ provider: 1 });

export const Integration = models.Integration || model<IIntegration>("Integration", IntegrationSchema);

