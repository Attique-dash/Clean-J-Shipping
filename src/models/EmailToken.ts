import { Schema, model, models, Types } from "mongoose";

export interface IEmailToken {
  _id?: string;
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  used?: boolean;
  createdAt?: Date;
}

const EmailTokenSchema = new Schema<IEmailToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const EmailToken = models.EmailToken || model<IEmailToken>("EmailToken", EmailTokenSchema);
