import { Schema, model, models, Types } from "mongoose";

export type PaymentStatus = "initiated" | "authorized" | "captured" | "failed" | "refunded";
export type PaymentMethod = "visa" | "mastercard" | "amex" | "bank" | "wallet";

export interface IPayment {
  _id?: string;
  userCode: string;
  customer?: Types.ObjectId;
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference?: string; // merchant-side reference
  gatewayId?: string; // gateway transaction id
  status: PaymentStatus;
  trackingNumber?: string;
  meta?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userCode: { type: String, required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    method: { type: String, enum: ["visa", "mastercard", "amex", "bank", "wallet"], required: true },
    reference: { type: String },
    gatewayId: { type: String },
    status: { type: String, enum: ["initiated", "authorized", "captured", "failed", "refunded"], default: "initiated", index: true },
    trackingNumber: { type: String },
    meta: { type: Object },
  },
  { timestamps: true }
);

export const Payment = models.Payment || model<IPayment>("Payment", PaymentSchema);
