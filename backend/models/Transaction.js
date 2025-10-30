const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  txHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  blockNumber: {
    type: Number,
    index: true
  },
  blockHash: String,
  from: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  to: {
    type: String,
    lowercase: true,
    index: true
  },
  assetId: {
    type: Number,
    index: true
  },
  tokenId: {
    type: Number,
    index: true
  },
  type: {
    type: String,
    enum: ['registration', 'transfer', 'status_change', 'compliance_update', 'metadata_update', 'valuation_update'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
    index: true
  },
  gasUsed: String,
  gasPrice: String,
  confirmationCount: {
    type: Number,
    default: 0
  },
  error: String,
  eventData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  confirmedAt: Date
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ from: 1, createdAt: -1 });
transactionSchema.index({ to: 1, createdAt: -1 });
transactionSchema.index({ assetId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);

