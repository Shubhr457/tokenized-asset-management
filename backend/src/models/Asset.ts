import mongoose, { Schema, Document, Model } from 'mongoose';
import { IAsset } from '../interfaces';

export interface IAssetDocument extends IAsset, Document {
  addTransfer(from: string, to: string, price: string, txHash: string): Promise<IAssetDocument>;
  updateStatus(newStatus: IAsset['status']): Promise<IAssetDocument>;
}

const assetSchema = new Schema<IAssetDocument>({
  assetId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  tokenId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  owner: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address format'
    }
  },
  assetType: {
    type: String,
    required: true,
    enum: ['property', 'share', 'collectible', 'document', 'other'],
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  metadataURI: {
    type: String,
    required: true
  },
  valuation: {
    type: String,
    required: true
  },
  valuationCurrency: {
    type: String,
    default: 'MATIC'
  },
  isCompliant: {
    type: Boolean,
    default: false,
    index: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Frozen', 'Delisted'],
    default: 'Pending',
    index: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadedAt: Date
  }],
  images: [{
    url: String,
    caption: String,
    uploadedAt: Date
  }],
  additionalMetadata: {
    type: Map,
    of: Schema.Types.Mixed
  },
  transferHistory: [{
    from: String,
    to: String,
    price: String,
    timestamp: Date,
    txHash: String
  }],
  complianceNotes: [{
    note: String,
    addedBy: String,
    addedAt: Date
  }]
}, {
  timestamps: true
});

// Indexes
assetSchema.index({ owner: 1, status: 1 });
assetSchema.index({ assetType: 1, status: 1 });
assetSchema.index({ tokenId: 1 });
assetSchema.index({ createdAt: -1 });

// Methods
assetSchema.methods.addTransfer = function(from: string, to: string, price: string, txHash: string) {
  this.transferHistory.push({
    from,
    to,
    price,
    timestamp: new Date(),
    txHash
  });
  return this.save();
};

assetSchema.methods.updateStatus = function(newStatus: IAsset['status']) {
  this.status = newStatus;
  this.updatedAt = new Date();
  return this.save();
};

const Asset: Model<IAssetDocument> = mongoose.model<IAssetDocument>('Asset', assetSchema);

export default Asset;

