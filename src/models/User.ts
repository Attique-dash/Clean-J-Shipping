import { Schema, model, models } from "mongoose";

export type UserRole = "admin" | "customer" | "warehouse";

export interface IUser {
  _id?: string;
  userCode: string; // external code used by warehouse
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  branch?: string;
  serviceTypeIDs?: string[];
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  role: UserRole;
  accountStatus?: "active" | "inactive";
  lastLogin?: Date;
  emailVerified?: boolean;
  accountType?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userCode: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    branch: { type: String },
    serviceTypeIDs: [{ type: String }],
    phone: { type: String },
    address: {
      type: new Schema(
        {
          street: { type: String },
          city: { type: String },
          state: { type: String },
          zipCode: { type: String },
          country: { type: String },
        },
        { _id: false }
      ),
    },
    accountStatus: { type: String, enum: ["active", "inactive"], default: "active" },
    lastLogin: { type: Date },
    emailVerified: { type: Boolean, default: false },
    accountType: { type: String },
    role: { type: String, enum: ["admin", "customer", "warehouse"], default: "customer" },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema);

