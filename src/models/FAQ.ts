import { Schema, model, models } from "mongoose";

export interface IFAQ {
  _id?: string;
  question: string;
  answer: string;
  category: string; // 'shipping', 'rates', 'policies', 'account', 'general'
  order: number; // Display order
  isActive: boolean;
  views?: number; // Track how many times viewed
  helpful?: number; // Track helpful votes
  notHelpful?: number; // Track not helpful votes
  createdBy?: string; // Admin ID
  updatedBy?: string; // Admin ID
  createdAt: Date;
  updatedAt: Date;
}

const FAQSchema = new Schema<IFAQ>({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, required: true, index: true },
  order: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
  views: { type: Number, default: 0 },
  helpful: { type: Number, default: 0 },
  notHelpful: { type: Number, default: 0 },
  createdBy: { type: String },
  updatedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

FAQSchema.index({ category: 1, isActive: 1, order: 1 });

export const FAQ = models.FAQ || model<IFAQ>("FAQ", FAQSchema);

