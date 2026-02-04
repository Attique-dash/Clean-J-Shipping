import mongoose, { Schema, Document } from 'mongoose';

export interface IApiKey extends Document {
  key: string;
  name: string;
  description?: string;
  warehouseId: mongoose.Types.ObjectId;
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsed?: Date;
  usageCount: number;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isExpired(): boolean;
  canUse(): boolean;
}

const rateLimitSchema = new Schema({
  requestsPerMinute: {
    type: Number,
    min: 1,
    default: 60
  },
  requestsPerHour: {
    type: Number,
    min: 1,
    default: 1000
  },
  requestsPerDay: {
    type: Number,
    min: 1,
    default: 10000
  }
}, { _id: false });

const apiKeySchema = new Schema<IApiKey>({
  key: {
    type: String,
    required: [true, 'API key is required'],
    unique: true,
    trim: true,
    match: [/^wh_[a-zA-Z0-9]{32}$/, 'API key must follow the format: wh_ followed by 32 alphanumeric characters']
  },
  name: {
    type: String,
    required: [true, 'API key name is required'],
    trim: true,
    maxlength: [100, 'API key name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  warehouseId: {
    type: Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Warehouse ID is required']
  },
  permissions: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  },
  lastUsed: {
    type: Date
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  rateLimit: rateLimitSchema,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Methods
apiKeySchema.methods.isExpired = function(): boolean {
  return this.expiresAt ? this.expiresAt < new Date() : false;
};

apiKeySchema.methods.canUse = function(): boolean {
  return this.isActive && !this.isExpired();
};

// Indexes
apiKeySchema.index({ key: 1 });
apiKeySchema.index({ warehouseId: 1 });
apiKeySchema.index({ isActive: 1 });
apiKeySchema.index({ expiresAt: 1 });
apiKeySchema.index({ createdBy: 1 });
apiKeySchema.index({ createdAt: -1 });

export const ApiKey = mongoose.model<IApiKey>('ApiKey', apiKeySchema);
