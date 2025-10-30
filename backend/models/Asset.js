const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
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
      validator: function(v) {
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
    type: String, // Store as string to handle large numbers
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
  // Off-chain metadata
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
    of: mongoose.Schema.Types.Mixed
  },
  // Transfer history (off-chain copy)
  transferHistory: [{
    from: String,
    to: String,
    price: String,
    timestamp: Date,
    txHash: String
  }],
  // Compliance and admin notes
  complianceNotes: [{
    note: String,
    addedBy: String,
    addedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
assetSchema.index({ owner: 1, status: 1 });
assetSchema.index({ assetType: 1, status: 1 });
assetSchema.index({ tokenId: 1 });
assetSchema.index({ createdAt: -1 });

// Methods
assetSchema.methods.addTransfer = function(from, to, price, txHash) {
  this.transferHistory.push({
    from,
    to,
    price: price.toString(),
    timestamp: new Date(),
    txHash
  });
  return this.save();
};

assetSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Asset', assetSchema);

