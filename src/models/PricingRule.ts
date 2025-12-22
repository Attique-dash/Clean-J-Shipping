import { Schema, model, models, Types } from "mongoose";

export interface IPricingRule {
  _id?: Types.ObjectId;
  name: string;
  origin: string;
  destination: string;
  weightMin: number;
  weightMax: number;
  baseRate: number;
  perKgRate: number;
  currency: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const PricingRuleSchema = new Schema<IPricingRule>(
  {
    name: { type: String, required: true, index: true },
    origin: { type: String, required: true, index: true },
    destination: { type: String, required: true, index: true },
    weightMin: { type: Number, required: true, min: 0 },
    weightMax: { type: Number, required: true, min: 0 },
    baseRate: { type: Number, required: true, min: 0 },
    perKgRate: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

PricingRuleSchema.index({ origin: 1, destination: 1, active: 1 });
PricingRuleSchema.index({ weightMin: 1, weightMax: 1 });

export const PricingRule = models.PricingRule || model<IPricingRule>("PricingRule", PricingRuleSchema);

export default PricingRule;

