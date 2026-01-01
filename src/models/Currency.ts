import { Schema, model, models } from "mongoose";

export interface ICurrency {
  _id?: string;
  code: string; // USD, JMD, GBP, EUR
  name: string; // US Dollar, Jamaican Dollar, British Pound, Euro
  symbol: string; // $, J$, £, €
  isActive: boolean;
  exchangeRate: number; // Rate relative to USD (base currency)
  lastUpdated: Date;
  decimalPlaces: number;
  format: string; // "$1,234.56", "£1,234.56", etc.
}

const CurrencySchema = new Schema<ICurrency>(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    exchangeRate: { type: Number, required: true, default: 1.0 },
    lastUpdated: { type: Date, default: Date.now },
    decimalPlaces: { type: Number, required: true, default: 2 },
    format: { type: String, required: true, default: "$1,234.56" },
  },
  { timestamps: true }
);

// Index for faster lookups
CurrencySchema.index({ code: 1 });
CurrencySchema.index({ isActive: 1 });

export const Currency = models.Currency || model<ICurrency>("Currency", CurrencySchema);
