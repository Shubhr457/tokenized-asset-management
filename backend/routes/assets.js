const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const Asset = require('../models/Asset');
const User = require('../models/User');
const web3Service = require('../services/web3Service');
const logger = require('../utils/logger');

// Get all assets with pagination and filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.owner) filter.owner = req.query.owner.toLowerCase();
    if (req.query.assetType) filter.assetType = req.query.assetType;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.isCompliant !== undefined) filter.isCompliant = req.query.isCompliant === 'true';

    const assets = await Asset.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-transferHistory -complianceNotes');

    const total = await Asset.countDocuments(filter);

    res.json({
      success: true,
      data: assets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching assets:', error);
    res.status(500).json({ success: false, message: 'Error fetching assets' });
  }
});

// Get asset by ID
router.get('/:assetId', [
  param('assetId').isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const assetId = parseInt(req.params.assetId);
    
    // Get from database
    let asset = await Asset.findOne({ assetId });
    
    // Sync with blockchain if exists
    if (asset) {
      try {
        const blockchainInfo = await web3Service.getAssetInfo(assetId);
        // Update local copy if blockchain data differs
        if (asset.owner.toLowerCase() !== blockchainInfo.owner.toLowerCase()) {
          asset.owner = blockchainInfo.owner.toLowerCase();
        }
        asset.isCompliant = blockchainInfo.isCompliant;
        asset.status = blockchainInfo.status;
        await asset.save();
      } catch (error) {
        logger.warn(`Could not sync asset ${assetId} with blockchain:`, error.message);
      }
    } else {
      // Try to get from blockchain and create record
      try {
        const blockchainInfo = await web3Service.getAssetInfo(assetId);
        asset = new Asset({
          assetId,
          tokenId: assetId,
          owner: blockchainInfo.owner.toLowerCase(),
          assetType: blockchainInfo.assetType,
          metadataURI: blockchainInfo.metadataURI,
          valuation: blockchainInfo.valuation,
          isCompliant: blockchainInfo.isCompliant,
          status: blockchainInfo.status,
          registrationDate: blockchainInfo.registrationDate
        });
        await asset.save();
      } catch (error) {
        return res.status(404).json({ success: false, message: 'Asset not found' });
      }
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    logger.error('Error fetching asset:', error);
    res.status(500).json({ success: false, message: 'Error fetching asset' });
  }
});

// Register new asset
router.post('/register', [
  body('to').isEthereumAddress(),
  body('metadataURI').notEmpty(),
  body('assetType').isIn(['property', 'share', 'collectible', 'document', 'other']),
  body('valuation').isFloat({ min: 0 }),
  body('name').notEmpty(),
  body('description').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { to, metadataURI, assetType, valuation, name, description } = req.body;

    // Check if user is verified
    const isVerified = await web3Service.isUserVerified(to);
    if (!isVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient is not verified. Please complete KYC verification first.' 
      });
    }

    // Register on blockchain
    const result = await web3Service.registerAsset(to, metadataURI, assetType, valuation);

    // Create asset record (will be updated by event listener)
    const asset = new Asset({
      assetId: 0, // Will be updated by event listener
      tokenId: 0,
      owner: to.toLowerCase(),
      assetType,
      name,
      description,
      metadataURI,
      valuation: valuation.toString(),
      status: 'Pending'
    });

    // Save transaction
    const Transaction = require('../models/Transaction');
    await Transaction.create({
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      from: to.toLowerCase(),
      type: 'registration',
      status: 'pending',
      eventData: { metadataURI, assetType, valuation }
    });

    res.status(201).json({
      success: true,
      message: 'Asset registration initiated',
      data: {
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        status: 'pending'
      }
    });
  } catch (error) {
    logger.error('Error registering asset:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error registering asset' 
    });
  }
});

// Get assets by owner
router.get('/owner/:address', [
  param('address').isEthereumAddress()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const address = req.params.address.toLowerCase();
    
    // Get from database
    const assets = await Asset.find({ owner: address })
      .sort({ createdAt: -1 })
      .select('-transferHistory -complianceNotes');

    // Optionally sync with blockchain
    if (req.query.sync === 'true') {
      try {
        const blockchainTokenIds = await web3Service.getAssetsByOwner(address);
        // Sync logic here if needed
      } catch (error) {
        logger.warn('Could not sync with blockchain:', error.message);
      }
    }

    res.json({ success: true, data: assets });
  } catch (error) {
    logger.error('Error fetching assets by owner:', error);
    res.status(500).json({ success: false, message: 'Error fetching assets' });
  }
});

// Get transfer history for an asset
router.get('/:assetId/transfers', [
  param('assetId').isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const assetId = parseInt(req.params.assetId);
    const asset = await Asset.findOne({ assetId });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Get from blockchain
    const blockchainHistory = await web3Service.getTransferHistory(assetId);

    res.json({ 
      success: true, 
      data: {
        database: asset.transferHistory,
        blockchain: blockchainHistory
      }
    });
  } catch (error) {
    logger.error('Error fetching transfer history:', error);
    res.status(500).json({ success: false, message: 'Error fetching transfer history' });
  }
});

module.exports = router;

