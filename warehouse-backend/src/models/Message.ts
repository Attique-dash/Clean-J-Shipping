import mongoose, { Schema, Document } from 'mongoose';
import { MESSAGE_TYPES } from '../utils/constants';

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  subject?: string;
  content: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  readAt?: Date;
  replyTo?: mongoose.Types.ObjectId;
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  }>;
  metadata?: Record<string, any>;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  url: {
    type: String,
    required: true
  }
}, { _id: false });

const messageSchema = new Schema<IMessage>({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required']
  },
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient ID is required']
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [2000, 'Message content cannot exceed 2000 characters']
  },
  type: {
    type: String,
    enum: Object.values(MESSAGE_TYPES),
    default: MESSAGE_TYPES.NOTIFICATION
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  attachments: [attachmentSchema],
  metadata: {
    type: Schema.Types.Mixed
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
messageSchema.index({ senderId: 1 });
messageSchema.index({ recipientId: 1 });
messageSchema.index({ type: 1 });
messageSchema.index({ priority: 1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ sentAt: -1 });
messageSchema.index({ createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
