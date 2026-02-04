import mongoose, { Schema, Document } from 'mongoose';

export interface IWarehouse extends Document {
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  contact: {
    phone: string;
    email: string;
    manager?: string;
  };
  dimensions?: {
    totalArea: number;
    storageArea: number;
    officeArea: number;
    unit: string;
  };
  operatingHours: {
    monday: { open: string; close: string };
    tuesday: { open: string; close: string };
    wednesday: { open: string; close: string };
    thursday: { open: string; close: string };
    friday: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday: { open: string; close: string };
  };
  capabilities: string[];
  isActive: boolean;
  capacity: {
    totalPackages: number;
    currentPackages: number;
    maxWeight: number;
    currentWeight: number;
  };
  staff: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema({
  street: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  zipCode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  coordinates: {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 }
  }
}, { _id: false });

const contactSchema = new Schema({
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,20}$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    required: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  manager: {
    type: String,
    trim: true,
    maxlength: 100
  }
}, { _id: false });

const dimensionsSchema = new Schema({
  totalArea: { type: Number, min: 0 },
  storageArea: { type: Number, min: 0 },
  officeArea: { type: Number, min: 0 },
  unit: {
    type: String,
    enum: ['sqft', 'sqm'],
    default: 'sqft'
  }
}, { _id: false });

const operatingHoursSchema = new Schema({
  monday: {
    open: { type: String, required: true },
    close: { type: String, required: true }
  },
  tuesday: {
    open: { type: String, required: true },
    close: { type: String, required: true }
  },
  wednesday: {
    open: { type: String, required: true },
    close: { type: String, required: true }
  },
  thursday: {
    open: { type: String, required: true },
    close: { type: String, required: true }
  },
  friday: {
    open: { type: String, required: true },
    close: { type: String, required: true }
  },
  saturday: {
    open: { type: String, required: true },
    close: { type: String, required: true }
  },
  sunday: {
    open: { type: String, required: true },
    close: { type: String, required: true }
  }
}, { _id: false });

const capacitySchema = new Schema({
  totalPackages: {
    type: Number,
    required: true,
    min: 0
  },
  currentPackages: {
    type: Number,
    default: 0,
    min: 0
  },
  maxWeight: {
    type: Number,
    required: true,
    min: 0
  },
  currentWeight: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const warehouseSchema = new Schema<IWarehouse>({
  name: {
    type: String,
    required: [true, 'Warehouse name is required'],
    trim: true,
    maxlength: [100, 'Warehouse name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Warehouse code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]{3,10}$/, 'Warehouse code must be 3-10 alphanumeric characters']
  },
  address: {
    type: addressSchema,
    required: [true, 'Address is required']
  },
  contact: {
    type: contactSchema,
    required: [true, 'Contact information is required']
  },
  dimensions: dimensionsSchema,
  operatingHours: {
    type: operatingHoursSchema,
    required: [true, 'Operating hours are required']
  },
  capabilities: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  capacity: {
    type: capacitySchema,
    required: [true, 'Capacity information is required']
  },
  staff: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for utilization percentage
warehouseSchema.virtual('utilizationPercentage').get(function() {
  if (this.capacity.totalPackages === 0) return 0;
  return (this.capacity.currentPackages / this.capacity.totalPackages) * 100;
});

// Indexes
warehouseSchema.index({ code: 1 });
warehouseSchema.index({ name: 1 });
warehouseSchema.index({ isActive: 1 });
warehouseSchema.index({ 'address.city': 1 });
warehouseSchema.index({ 'address.state': 1 });
warehouseSchema.index({ createdAt: -1 });

export const Warehouse = mongoose.model<IWarehouse>('Warehouse', warehouseSchema);
