import { Schema, model, models, Types } from "mongoose";

export interface IPreAlert {
  _id?: Types.ObjectId;
  userCode: string;
  customer?: Types.ObjectId;
  trackingNumber: string;
  carrier: string;
  origin: string;
  expectedDate: Date;
  notes?: string;
  status?: "submitted" | "approved" | "rejected";
  decidedBy?: Types.ObjectId | null;
  decidedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  // File attachment for pre-alert (e.g., invoice, receipt)
  attachmentFile?: {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    url?: string;
  };
  // Additional fields for pre-alert details
  description?: string;
  pricePaid?: number;
  overseasCourier?: string;
}

const PreAlertSchema = new Schema<IPreAlert>(
  {
    userCode: { type: String, required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    trackingNumber: { type: String, required: true },
    carrier: { type: String, required: true },
    origin: { type: String, required: true },
    expectedDate: { type: Date, required: true },
    notes: { type: String },
    status: { type: String, enum: ["submitted", "approved", "rejected"], default: "submitted", index: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    decidedAt: { type: Date },
    // File attachment for pre-alert (e.g., invoice, receipt)
    attachmentFile: {
      filename: { type: String },
      originalName: { type: String },
      mimetype: { type: String },
      size: { type: Number },
      path: { type: String },
      url: { type: String },
    },
    // Additional fields for pre-alert details
    description: { type: String },
    pricePaid: { type: Number },
    overseasCourier: { type: String },
  },
  { timestamps: true }
);

export const PreAlert = models.PreAlert || model<IPreAlert>("PreAlert", PreAlertSchema);
