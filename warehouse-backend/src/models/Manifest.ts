import mongoose, { Schema, Document } from 'mongoose';

export interface IManifestItem {
  packageId: mongoose.Types.ObjectId;
  trackingNumber: string;
  status: string;
  notes?: string;
}

export interface IManifest extends Document {
  manifestNumber: string;
  warehouseId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  vehicleInfo?: {
    make: string;
    model: string;
    licensePlate: string;
    color?: string;
  };
  route?: {
    startLocation: string;
    endLocation: string;
    stops: Array<{
      address: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
      estimatedTime?: Date;
      actualTime?: Date;
      packages: mongoose.Types.ObjectId[];
    }>;
  };
  packages: IManifestItem[];
  status: 'draft' | 'in-progress' | 'completed' | 'cancelled';
  scheduledDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalPackages: number;
  deliveredPackages: number;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const manifestItemSchema = new Schema<IManifestItem>({
  packageId: {
    type: Schema.Types.ObjectId,
    ref: 'Package',
    required: true
  },
  trackingNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'returned'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, { _id: false });

const routeStopSchema = new Schema({
  address: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 }
  },
  estimatedTime: { type: Date },
  actualTime: { type: Date },
  packages: [{
    type: Schema.Types.ObjectId,
    ref: 'Package'
  }]
}, { _id: false });

const vehicleInfoSchema = new Schema({
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  licensePlate: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    trim: true
  }
}, { _id: false });

const routeSchema = new Schema({
  startLocation: {
    type: String,
    required: true,
    trim: true
  },
  endLocation: {
    type: String,
    required: true,
    trim: true
  },
  stops: [routeStopSchema]
}, { _id: false });

const manifestSchema = new Schema<IManifest>({
  manifestNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  warehouseId: {
    type: Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  driverId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  vehicleInfo: vehicleInfoSchema,
  route: routeSchema,
  packages: [manifestItemSchema],
  status: {
    type: String,
    enum: ['draft', 'in-progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  scheduledDate: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  totalPackages: {
    type: Number,
    default: 0,
    min: 0
  },
  deliveredPackages: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
manifestSchema.index({ manifestNumber: 1 });
manifestSchema.index({ warehouseId: 1 });
manifestSchema.index({ driverId: 1 });
manifestSchema.index({ status: 1 });
manifestSchema.index({ scheduledDate: 1 });
manifestSchema.index({ createdAt: -1 });

export const Manifest = mongoose.model<IManifest>('Manifest', manifestSchema);
