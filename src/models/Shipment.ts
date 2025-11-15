import mongoose, { Document, Schema } from 'mongoose';

export interface IStatusUpdate {
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled';
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  timestamp: Date;
  notes?: string;
}

export interface IShipment extends Document {
  trackingNumber: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled';
  statusHistory: IStatusUpdate[];
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
    lastUpdated: Date;
  };
  package: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const statusUpdateSchema = new Schema<IStatusUpdate>({
  status: {
    type: String,
    enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'],
    required: true
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  address: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  notes: String
});

const shipmentSchema = new Schema<IShipment>(
  {
    trackingNumber: { 
      type: String, 
      unique: true, 
      required: true,
      index: true 
    },
    status: { 
      type: String, 
      enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
      index: true
    },
    statusHistory: [statusUpdateSchema],
    currentLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: true },
      lastUpdated: { type: Date, default: Date.now }
    },
    package: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
      required: true
    }
  },
  { timestamps: true }
);

// Generate tracking number before saving
shipmentSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  const prefix = 'TRK';
  const random = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
  this.trackingNumber = `${prefix}${random}`;
  
  // Add initial status to history
  this.statusHistory.push({
    status: this.status,
    location: this.currentLocation,
    address: this.currentLocation.address,
    timestamp: new Date(),
    notes: 'Shipment created'
  });
  
  next();
});

// Update status history when status changes
shipmentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      location: this.currentLocation,
      address: this.currentLocation.address,
      timestamp: new Date(),
      notes: `Status updated to ${this.status}`
    });
  }
  next();
});

export default mongoose.models.Shipment || mongoose.model<IShipment>('Shipment', shipmentSchema);
