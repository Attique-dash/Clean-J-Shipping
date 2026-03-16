import mongoose, { Schema, Document } from 'mongoose';

export interface IKcdApiKey extends Document {
  apiKey: string;
  courierCode: string;
  description: string;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId;
  lastUsed: Date | null;
  usageCount: number;
  deactivatedAt?: Date;
  deactivatedBy?: mongoose.Types.ObjectId;
}

const kcdApiKeySchema = new Schema<IKcdApiKey>(
  {
    apiKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    courierCode: {
      type: String,
      required: true,
      index: true
    },
    description: String,
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastUsed: {
      type: Date,
      default: null
    },
    usageCount: {
      type: Number,
      default: 0
    },
    deactivatedAt: Date,
    deactivatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Index for finding active, non-expired keys
kcdApiKeySchema.index(
  { isActive: 1, expiresAt: 1 },
  { name: 'active_keys_index' }
);

export const KcdApiKey = mongoose.model<IKcdApiKey>('KcdApiKey', kcdApiKeySchema);
