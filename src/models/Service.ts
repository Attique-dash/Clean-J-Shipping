import mongoose, { Document, Schema } from 'mongoose';

export interface IService extends Document {
  name: string;
  description: string;
  serviceType: 'storage' | 'shipping' | 'customs' | 'delivery' | 'handling' | 'other';
  unitPrice: number;
  isActive: boolean;
  isDefault: boolean;
  calculationMethod: 'fixed' | 'per_kg' | 'per_day' | 'per_package';
  conditions?: {
    packageStatus?: string[];
    weightRange?: {
      min?: number;
      max?: number;
    };
    branch?: string[];
    daysInStorage?: {
      min?: number;
      max?: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    serviceType: {
      type: String,
      enum: ['storage', 'shipping', 'customs', 'delivery', 'handling', 'other'],
      required: true
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    calculationMethod: {
      type: String,
      enum: ['fixed', 'per_kg', 'per_day', 'per_package'],
      default: 'fixed'
    },
    conditions: {
      packageStatus: [String],
      weightRange: {
        min: Number,
        max: Number
      },
      branch: [String],
      daysInStorage: {
        min: Number,
        max: Number
      }
    }
  },
  { timestamps: true }
);

// Create indexes for better performance
serviceSchema.index({ serviceType: 1, isActive: 1 });
serviceSchema.index({ isDefault: 1 });

export default mongoose.models.Service || mongoose.model<IService>('Service', serviceSchema);
