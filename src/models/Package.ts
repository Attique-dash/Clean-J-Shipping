// src/models/Package.ts
import { Schema, model, models, Types } from "mongoose";

export type PackageStatus = 
  | "Unknown" 
  | "At Warehouse" 
  | "In Transit" 
  | "At Local Port" 
  | "Delivered" 
  | "Deleted";

export interface IPackage {
  _id?: Types.ObjectId;
  trackingNumber: string;
  userCode: string;
  customer?: Types.ObjectId;
  weight?: number;
  shipper?: string;
  description?: string;
  status: PackageStatus;
  length?: number;
  width?: number;
  height?: number;
  entryStaff?: string;
  branch?: string;
  controlNumber?: string;
  manifestId?: string;
  serviceTypeId?: string;
  serviceTypeName?: string;
  externalStatusLabel?: string;
  invoiceRecords?: any[];
  invoiceDocuments?: any[];
  history?: Array<{
    status: PackageStatus;
    at: Date;
    note?: string;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
  entryDate?: Date;
}

const PackageSchema = new Schema<IPackage>(
  {
    trackingNumber: { type: String, required: true, unique: true, index: true },
    userCode: { type: String, required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    weight: { type: Number },
    shipper: { type: String },
    description: { type: String },
    status: {
      type: String,
      enum: ["Unknown", "At Warehouse", "In Transit", "At Local Port", "Delivered", "Deleted"],
      default: "Unknown",
      index: true,
    },
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    entryStaff: { type: String },
    branch: { type: String },
    controlNumber: { type: String },
    manifestId: { type: String },
    serviceTypeId: { type: String },
    serviceTypeName: { type: String },
    externalStatusLabel: { type: String },
    invoiceRecords: [{ type: Schema.Types.Mixed }],
    invoiceDocuments: [{ type: Schema.Types.Mixed }],
    history: [
      {
        status: {
          type: String,
          enum: ["Unknown", "At Warehouse", "In Transit", "At Local Port", "Delivered", "Deleted"],
        },
        at: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
    entryDate: { type: Date },
  },
  { timestamps: true }
);

PackageSchema.index({ userCode: 1, status: 1 });
PackageSchema.index({ createdAt: -1 });

export const Package = models.Package || model<IPackage>("Package", PackageSchema);