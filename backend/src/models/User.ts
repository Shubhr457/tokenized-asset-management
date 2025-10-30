import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser } from '../interfaces';

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address format'
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_started'],
    default: 'not_started'
  },
  kycDocuments: [{
    documentType: String,
    documentUrl: String,
    uploadedAt: Date
  }],
  complianceNotes: [{
    note: String,
    addedBy: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  role: {
    type: String,
    enum: ['user', 'admin', 'compliance', 'minter'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Indexes
userSchema.index({ walletAddress: 1 });
userSchema.index({ email: 1 });
userSchema.index({ kycStatus: 1 });
userSchema.index({ isVerified: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Methods
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.kycDocuments;
  delete obj.complianceNotes;
  return obj;
};

const User: Model<IUserDocument> = mongoose.model<IUserDocument>('User', userSchema);

export default User;

