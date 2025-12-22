import { Schema, model, models, Document } from "mongoose";

export interface IInventory extends Document {
  name: string;
  category: string; // 'packaging', 'labels', 'tape', 'boxes', 'bubble_wrap', 'other'
  currentStock: number;
  minStock: number; // Minimum stock level before reorder
  maxStock: number; // Maximum stock capacity
  unit: string; // 'pieces', 'rolls', 'boxes', 'kg', 'meters'
  location?: string; // Warehouse location (e.g., "Shelf A-3")
  supplier?: string;
  lastRestocked?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>({
  name: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  currentStock: { type: Number, required: true, default: 0 },
  minStock: { type: Number, required: true, default: 0 },
  maxStock: { type: Number, required: true, default: 1000 },
  unit: { type: String, required: true, default: "pieces" },
  location: { type: String },
  supplier: { type: String },
  lastRestocked: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Inventory = models.Inventory || model<IInventory>("Inventory", InventorySchema);

