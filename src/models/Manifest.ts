import { Schema, model, models } from "mongoose";

export interface IManifest {
  _id?: string;
  manifestId: string;
  description?: string;
  // Explicit fields from external payload (all optional)
  courierId?: string;
  serviceTypeId?: string;
  serviceTypeName?: string; // derived from mapping
  manifestStatus?: string; // external sends "0" etc.
  manifestStatusLabel?: string; // derived human-readable label
  manifestCode?: string;
  flightDate?: Date | null;
  weight?: number;
  itemCount?: number;
  manifestNumber?: number;
  staffName?: string;
  entryDate?: Date | null;
  entryDateTime?: Date | null;
  awbNumber?: string;
  collectionCodes?: string[];
  packageAwbs?: string[];
  data?: any; // raw payload
  createdAt?: Date;
  updatedAt?: Date;
}

const ManifestSchema = new Schema<IManifest>(
  {
    manifestId: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    courierId: { type: String },
    serviceTypeId: { type: String },
    serviceTypeName: { type: String },
    manifestStatus: { type: String },
    manifestStatusLabel: { type: String },
    manifestCode: { type: String },
    flightDate: { type: Date },
    weight: { type: Number },
    itemCount: { type: Number },
    manifestNumber: { type: Number },
    staffName: { type: String },
    entryDate: { type: Date },
    entryDateTime: { type: Date },
    awbNumber: { type: String },
    collectionCodes: [{ type: String }],
    packageAwbs: [{ type: String }],
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Manifest = models.Manifest || model<IManifest>("Manifest", ManifestSchema);
