import { Schema, model, models, Types } from "mongoose";

export type MessageSender = "customer" | "support";

export interface IMessage {
  _id?: string;
  userCode: string;
  customer?: Types.ObjectId;
  subject?: string;
  body: string;
  sender: MessageSender;
  read?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    userCode: { type: String, required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    subject: { type: String },
    body: { type: String, required: true },
    sender: { type: String, enum: ["customer", "support"], required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Message = models.Message || model<IMessage>("Message", MessageSchema);
