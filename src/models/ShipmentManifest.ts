import mongoose, { Document, Schema } from 'mongoose';

export interface IShipmentManifest extends Document {
  manifestId: string;
  shipments: Array<{
    trackingNumber: string;
    weight?: number;
    status?: string;
  }>;
  totalItems: number;
  totalWeight: number;
  status: string;
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
    shipments: [{
      trackingNumber: { type: String, required: true },
      weight: { type: Number },
      status: { type: String },
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ShipmentManifest || mongoose.model<IShipmentManifest>('ShipmentManifest', ShipmentManifestSchema);
