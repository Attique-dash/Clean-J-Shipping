import { Schema, model, models } from "mongoose";
import crypto from "crypto";
import { hashPassword, comparePassword } from "@/lib/auth";

export type UserRole = "admin" | "customer" | "warehouse";

export interface IUser {
  _id?: string;
  userCode: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  passwordHash: string;
  password?: string;
  phone?: string;
  role: UserRole;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  accountStatus: "pending" | "active" | "inactive";
  emailVerified: boolean;
  registrationStep: number;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  generateVerificationToken(): string;
  generatePasswordResetToken(): string;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    userCode: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true,
      default: () => `USR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    },
    name: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true, 
      lowercase: true,
      trim: true,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please enter a valid email']
    },
    passwordHash: { 
      type: String, 
      required: true
    },
    phone: { 
      type: String,
      required: function(this: IUser) {
        return this.registrationStep > 1;
      }
    },
    role: { 
      type: String, 
      enum: ["admin", "customer", "warehouse"], 
      default: "customer", 
      index: true 
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Jamaica' },
    },
    accountStatus: { 
      type: String, 
      enum: ["pending", "active", "inactive"], 
      default: "pending" 
    },
    emailVerified: { 
      type: Boolean, 
      default: false 
    },
    registrationStep: { 
      type: Number, 
      default: 1, 
      min: 1, 
      max: 3 
    },
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    lastLogin: { type: Date },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for password
UserSchema.virtual('password')
  .get(function(this: any) {
    return this._password;
  })
  .set(function(this: any, value: string) {
    this._password = value;
  });

// Generate verification token
UserSchema.methods.generateVerificationToken = function(this: IUser) {
  const token = crypto.randomBytes(20).toString('hex');
  this.verificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  this.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function(this: IUser) {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return resetToken;
};

// Check if password matches
UserSchema.methods.matchPassword = async function(this: IUser, enteredPassword: string) {
  return await comparePassword(enteredPassword, this.passwordHash);
};

const User = (models && models.User) || model<IUser>("User", UserSchema);

export { User };
export default User;