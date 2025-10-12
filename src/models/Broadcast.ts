import { Schema, model, models, Types } from "mongoose";

export type BroadcastChannel = "email" | "portal";

export interface IBroadcast {
  _id?: string;
  title: string;
  body: string;
  channels: BroadcastChannel[];
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  createdBy?: Types.ObjectId | null;
  // delivery tracking (aggregated)
  totalRecipients?: number;
  portalDelivered?: number;
  emailDelivered?: number;
  emailFailed?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const BroadcastSchema = new Schema<IBroadcast>(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    channels: [{ type: String, enum: ["email", "portal"], default: "portal" }],
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    totalRecipients: { type: Number, default: 0 },
    portalDelivered: { type: Number, default: 0 },
    emailDelivered: { type: Number, default: 0 },
    emailFailed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Broadcast = models.Broadcast || model<IBroadcast>("Broadcast", BroadcastSchema);
