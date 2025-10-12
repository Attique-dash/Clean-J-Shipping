import { Schema, model, models, Types } from "mongoose";

export type PosMethod = "cash" | "card" | "visa" | "mastercard" | "amex" | "bank" | "wallet";

export interface IPosItem {
  sku?: string;
  productId?: string;
  name?: string;
  qty: number;
  unitPrice?: number;
  total: number;
}

export interface IPosTransaction {
  _id?: string;
  receiptNo: string;
  customerCode?: string;
  method: PosMethod;
  items: IPosItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  cashierId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const ItemSchema = new Schema<IPosItem>(
  {
    sku: String,
    productId: String,
    name: String,
    qty: { type: Number, required: true },
    unitPrice: Number,
    total: { type: Number, required: true },
  },
  { _id: false }
);

const PosTransactionSchema = new Schema<IPosTransaction>(
  {
    receiptNo: { type: String, required: true, unique: true, index: true },
    customerCode: { type: String },
    method: { type: String, enum: ["cash", "card", "visa", "mastercard", "amex", "bank", "wallet"], required: true },
    items: { type: [ItemSchema], required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    notes: String,
    cashierId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const PosTransaction = models.PosTransaction || model<IPosTransaction>("PosTransaction", PosTransactionSchema);
