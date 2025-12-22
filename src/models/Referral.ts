import { Schema, model, models } from "mongoose";

export interface IReferral {
  _id?: string;
  referrerId: string; // Customer ID who referred
  referredEmail: string; // Email of the person being referred
  referredName?: string;
  referralCode: string; // Unique referral code
  status: string; // 'pending', 'registered', 'completed', 'rewarded'
  rewardAmount?: number; // Reward amount earned
  rewardStatus?: string; // 'pending', 'credited', 'paid'
  referredUserId?: string; // ID of the user who signed up via referral
  registeredAt?: Date; // When the referred user registered
  completedAt?: Date; // When the referral was completed (e.g., first package shipped)
  rewardedAt?: Date; // When the reward was given
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>({
  referrerId: { type: String, required: true, index: true },
  referredEmail: { type: String, required: true, index: true },
  referredName: { type: String },
  referralCode: { type: String, required: true, unique: true, index: true },
  status: { type: String, default: "pending", index: true },
  rewardAmount: { type: Number, default: 0 },
  rewardStatus: { type: String, default: "pending" },
  referredUserId: { type: String, index: true },
  registeredAt: { type: Date },
  completedAt: { type: Date },
  rewardedAt: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ReferralSchema.index({ referrerId: 1, status: 1 });
ReferralSchema.index({ referralCode: 1 });

export const Referral = models.Referral || model<IReferral>("Referral", ReferralSchema);

