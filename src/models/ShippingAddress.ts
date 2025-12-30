import { Schema, model, models } from "mongoose";

export type AddressType = "air" | "sea" | "both";

export interface IShippingAddress {
  _id?: string;
  userId: Schema.Types.ObjectId;
  label: string;
  contactName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  isActive: boolean;
  addressType?: AddressType;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    label: { 
      type: String, 
      required: true,
      enum: ["Home", "Work", "Warehouse", "Other"]
    },
    contactName: { 
      type: String, 
      required: true,
      trim: true
    },
    phone: { 
      type: String, 
      required: true,
      trim: true
    },
    address: { 
      type: String, 
      required: true,
      trim: true
    },
    city: { 
      type: String, 
      required: true,
      trim: true
    },
    state: { 
      type: String, 
      required: true,
      trim: true
    },
    zipCode: { 
      type: String, 
      required: true,
      trim: true
    },
    country: { 
      type: String, 
      required: true,
      trim: true,
      default: "Jamaica"
    },
    isDefault: { 
      type: Boolean, 
      default: false,
      index: true
    },
    isActive: { 
      type: Boolean, 
      default: true,
      index: true
    },
    addressType: { 
      type: String, 
      enum: ["air", "sea", "both"], 
      default: "both" 
    },
    notes: { 
      type: String, 
      trim: true,
      maxlength: 500
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
ShippingAddressSchema.index({ userId: 1, isActive: 1 });
ShippingAddressSchema.index({ userId: 1, isDefault: 1 });
ShippingAddressSchema.index({ addressType: 1 });

const ShippingAddress = (models && models.ShippingAddress) || model<IShippingAddress>("ShippingAddress", ShippingAddressSchema);

export { ShippingAddress };
export default ShippingAddress;
