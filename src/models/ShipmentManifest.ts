import mongoose, { Document, Schema } from 'mongoose';

export interface IShipmentManifest extends Document {
  manifestId: string;
  title?: string;
  mode: 'air' | 'sea' | 'land';
  batchDate?: Date;
  shipments: Array<{
    trackingNumber: string;
    weight?: number;
    status?: string;
    notes?: string;
  }>;
  totalItems: number;
  totalWeight: number;
  status: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentManifestSchema = new Schema<IShipmentManifest>(
  {
    manifestId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
    },
    mode: {
      type: String,
      enum: ['air', 'sea', 'land'],
      default: 'air',
      required: true,
    },
    batchDate: {
      type: Date,
    },
    shipments: [{
      trackingNumber: { type: String, required: true },
      weight: { type: Number },
      status: { type: String, default: 'pending' },
      notes: { type: String },
    }],
    totalItems: {
      type: Number,
      required: true,
    },
    totalWeight: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: 'active',
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ShipmentManifest || mongoose.model<IShipmentManifest>('ShipmentManifest', ShipmentManifestSchema);
