import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../utils/constants';

export interface IUser extends Document {
  userCode: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role: 'admin' | 'customer' | 'warehouse';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  mailboxNumber?: string;
  accountStatus: 'pending' | 'active' | 'inactive';
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Staff management fields
  assignedWarehouse?: mongoose.Types.ObjectId;
  permissions?: string[];
  createdBy?: mongoose.Types.ObjectId;
  passwordResetAt?: Date;
  shippingAddresses?: Array<{
    _id?: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    type?: 'air' | 'sea' | 'china' | 'standard';
    isDefault?: boolean;
    createdAt?: Date;
  }>;
  preferences?: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    language: string;
    timezone: string;
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPublicProfile(): any;
}

const userSchema = new Schema<IUser>({
  userCode: {
    type: String,
    required: [true, 'User code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{2}-\d{3,4}$/, 'User code must be in format XX-123']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,20}$/, 'Please enter a valid phone number']
  },
  role: {
    type: String,
    enum: ['admin', 'customer', 'warehouse'],
    default: 'customer'
  },
  address: {
    street: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    zipCode: { type: String, required: false },
    country: { type: String, required: false, default: 'USA' }
  },
  mailboxNumber: {
    type: String,
    trim: true
  },
  accountStatus: {
    type: String,
    enum: ['pending', 'active', 'inactive'],
    default: 'pending'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  // Staff management fields
  assignedWarehouse: {
    type: Schema.Types.ObjectId,
    ref: 'Warehouse',
    default: null
  },
  permissions: [{
    type: String,
    default: []
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  passwordResetAt: {
    type: Date,
    default: null
  },
  // Customer shipping addresses
  shippingAddresses: [{
    _id: {
      type: Schema.Types.ObjectId,
      auto: true
    },
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: 'USA'
    },
    type: {
      type: String,
      enum: ['air', 'sea', 'china', 'standard'],
      default: 'standard'
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // User preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Get public profile (exclude sensitive data)
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    userCode: this.userCode,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    address: this.address,
    mailboxNumber: this.mailboxNumber,
    accountStatus: this.accountStatus,
    emailVerified: this.emailVerified,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ userCode: 1 });
userSchema.index({ role: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ assignedWarehouse: 1 });
userSchema.index({ 'shippingAddresses.isDefault': 1 });
userSchema.index({ createdBy: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
