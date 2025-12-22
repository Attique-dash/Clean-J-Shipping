import { Schema, model, models } from "mongoose";

export interface ISettings {
  _id?: string;
  key: string; // Unique setting key (e.g., 'currency', 'tax_rate', 'default_shipping_rule')
  value: unknown; // Can be string, number, boolean, or object
  category: string; // 'currency', 'tax', 'shipping', 'general'
  description?: string;
  updatedBy?: string; // Admin ID who last updated
  updatedAt: Date;
  createdAt: Date;
}

const SettingsSchema = new Schema<ISettings>({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: Schema.Types.Mixed, required: true },
  category: { type: String, required: true, index: true },
  description: { type: String },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

SettingsSchema.index({ category: 1, key: 1 });

export const Settings = models.Settings || model<ISettings>("Settings", SettingsSchema);

