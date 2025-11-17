import { Schema, model, models } from "mongoose";

export type UserRole = "admin" | "customer" | "warehouse";

export interface IUser {
  _id?: string;
  userCode: string;
  firstName?: string;
  lastName?: string;
  email: string;
  passwordHash: string;
  password?: string;
  phone?: string;
  role: UserRole;
  branch?: string;
  serviceTypeIDs?: string[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  accountStatus?: "active" | "inactive";
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userCode: { type: String, required: true, unique: true, index: true },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: ["admin", "customer", "warehouse"], default: "customer", index: true },
    branch: { type: String },
    serviceTypeIDs: [{ type: String }],
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    accountStatus: { type: String, enum: ["active", "inactive"], default: "active" },
    emailVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

UserSchema.virtual("password")
  .get(function() {
    return this.passwordHash;
  })
  .set(function(value) {
    this.passwordHash = value;
  });

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

const User = (models && models.User) || model<IUser>("User", UserSchema);

export { User };
export default User;