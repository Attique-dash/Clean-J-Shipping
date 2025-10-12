import { Schema, model, models, Types } from "mongoose";

export type PackageStatus =
  | "Unknown"
  | "At Warehouse"
  | "In Transit"
  | "At Local Port"
  | "Delivered"
  | "Deleted";

export interface IPackage {
  _id?: string;
  trackingNumber: string;
  userCode: string; // reference to User.userCode
  customer?: Types.ObjectId;
  weight?: number;
  shipper?: string;
  status: PackageStatus;
  description?: string;
  manifestId?: string;
  // Invoice documents uploaded by customers for customs clearance
  invoiceDocuments?: {
    filename: string;
    url: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
  }[];
  // Structured invoice submissions (metadata + document URL)
  invoiceRecords?: {
    invoiceNumber: string;
    invoiceDate: Date | string;
    totalValue: number;
    currency: string;
    documentUrl: string;
    items: {
      description: string;
      quantity: number;
      unitValue: number;
      totalValue: number;
    }[];
    status: "submitted" | "reviewed" | "rejected";
    submittedAt: Date | string;
  }[];
  // Newly added fields to support external warehouse payload
  externalPackageId?: string; // maps from PackageID
  courierId?: string; // maps from CourierID
  collectionId?: string; // maps from CollectionID
  controlNumber?: string;
  firstName?: string;
  lastName?: string;
  entryStaff?: string;
  entryDate?: Date | null;
  entryDateTime?: Date | null;
  branch?: string;
  claimed?: boolean;
  showControls?: boolean;
  hsCode?: string;
  unknown?: boolean;
  aiProcessed?: boolean;
  originalHouseNumber?: string;
  cubes?: number;
  length?: number;
  width?: number;
  height?: number;
  pieces?: number;
  discrepancy?: boolean;
  discrepancyDescription?: string;
  serviceTypeId?: string;
  hazmatCodeId?: string;
  coloaded?: boolean;
  coloadIndicator?: string;
  packagePayments?: string; // stored raw for now
  // Derived/readable fields
  serviceTypeName?: string; // from ServiceTypeID mapping
  externalStatusLabel?: string; // from external numeric status mapping
  history: { status: PackageStatus; at: Date; note?: string }[];
  createdAt?: Date;
  updatedAt?: Date;
}

const PackageSchema = new Schema<IPackage>(
  {
    trackingNumber: { type: String, required: true, unique: true, index: true },
    userCode: { type: String, required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    weight: { type: Number },
    shipper: { type: String },
    status: {
      type: String,
      enum: ["Unknown", "At Warehouse", "In Transit", "At Local Port", "Delivered", "Deleted"],
      default: "Unknown",
      index: true,
    },
    description: { type: String },
    manifestId: { type: String },
    invoiceDocuments: [
      new Schema(
        {
          filename: { type: String, required: true },
          url: { type: String, required: true },
          mimeType: { type: String, required: true },
          size: { type: Number, required: true },
          uploadedAt: { type: Date, default: Date.now },
        },
        { _id: false }
      ),
    ],
    invoiceRecords: [
      new Schema(
        {
          invoiceNumber: { type: String, required: true },
          invoiceDate: { type: Date, required: true },
          totalValue: { type: Number, required: true },
          currency: { type: String, default: "USD" },
          documentUrl: { type: String, required: true },
          items: [
            new Schema(
              {
                description: { type: String, required: true },
                quantity: { type: Number, required: true },
                unitValue: { type: Number, required: true },
                totalValue: { type: Number, required: true },
              },
              { _id: false }
            ),
          ],
          status: { type: String, enum: ["submitted", "reviewed", "rejected"], default: "submitted" },
          submittedAt: { type: Date, default: Date.now },
        },
        { _id: false }
      ),
    ],
    externalPackageId: { type: String },
    courierId: { type: String },
    collectionId: { type: String },
    controlNumber: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    entryStaff: { type: String },
    entryDate: { type: Date },
    entryDateTime: { type: Date },
    branch: { type: String },
    claimed: { type: Boolean },
    showControls: { type: Boolean },
    hsCode: { type: String },
    unknown: { type: Boolean },
    aiProcessed: { type: Boolean },
    originalHouseNumber: { type: String },
    cubes: { type: Number },
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    pieces: { type: Number },
    discrepancy: { type: Boolean },
    discrepancyDescription: { type: String },
    serviceTypeId: { type: String },
    hazmatCodeId: { type: String },
    coloaded: { type: Boolean },
    coloadIndicator: { type: String },
    packagePayments: { type: String },
    serviceTypeName: { type: String },
    externalStatusLabel: { type: String },
    history: [
      {
        status: {
          type: String,
          enum: ["Unknown", "At Warehouse", "In Transit", "At Local Port", "Delivered", "Deleted"],
          default: "Unknown",
        },
        at: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const Package = models.Package || model<IPackage>("Package", PackageSchema);
