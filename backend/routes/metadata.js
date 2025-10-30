const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const Asset = require('../models/Asset');
const web3Service = require('../services/web3Service');
const logger = require('../utils/logger');

// Update asset metadata URI (on-chain)
router.post('/assets/:assetId/metadata-uri', [
  param('assetId').isInt({ min: 0 }),
  body('metadataURI').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const assetId = parseInt(req.params.assetId);
    const { metadataURI } = req.body;

    // Update on blockchain (requires ADMIN_ROLE)
    // Note: This functionality would need to be added to the smart contract
    // For now, we'll just update the database
    
    await Asset.updateOne(
      { assetId },
      { metadataURI, updatedAt: new Date() }
    );

    res.json({ 
      success: true, 
      message: 'Metadata URI updated',
      data: { assetId, metadataURI }
    });
  } catch (error) {
    logger.error('Error updating metadata URI:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating metadata URI' 
    });
  }
});

// Add off-chain documents to asset
router.post('/assets/:assetId/documents', [
  param('assetId').isInt({ min: 0 }),
  body('name').notEmpty(),
  body('type').notEmpty(),
  body('url').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const assetId = parseInt(req.params.assetId);
    const { name, type, url } = req.body;

    const asset = await Asset.findOne({ assetId });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    asset.documents.push({
      name,
      type,
      url,
      uploadedAt: new Date()
    });

    await asset.save();

    res.json({ 
      success: true, 
      message: 'Document added',
      data: asset.documents[asset.documents.length - 1]
    });
  } catch (error) {
    logger.error('Error adding document:', error);
    res.status(500).json({ success: false, message: 'Error adding document' });
  }
});

// Add images to asset
router.post('/assets/:assetId/images', [
  param('assetId').isInt({ min: 0 }),
  body('url').notEmpty(),
  body('caption').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const assetId = parseInt(req.params.assetId);
    const { url, caption } = req.body;

    const asset = await Asset.findOne({ assetId });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    asset.images.push({
      url,
      caption,
      uploadedAt: new Date()
    });

    await asset.save();

    res.json({ 
      success: true, 
      message: 'Image added',
      data: asset.images[asset.images.length - 1]
    });
  } catch (error) {
    logger.error('Error adding image:', error);
    res.status(500).json({ success: false, message: 'Error adding image' });
  }
});

// Update additional metadata
router.post('/assets/:assetId/additional-metadata', [
  param('assetId').isInt({ min: 0 }),
  body('metadata').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const assetId = parseInt(req.params.assetId);
    const { metadata } = req.body;

    const asset = await Asset.findOne({ assetId });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Merge with existing metadata
    if (!asset.additionalMetadata) {
      asset.additionalMetadata = new Map();
    }
    
    Object.keys(metadata).forEach(key => {
      asset.additionalMetadata.set(key, metadata[key]);
    });

    await asset.save();

    res.json({ 
      success: true, 
      message: 'Additional metadata updated',
      data: Object.fromEntries(asset.additionalMetadata)
    });
  } catch (error) {
    logger.error('Error updating additional metadata:', error);
    res.status(500).json({ success: false, message: 'Error updating metadata' });
  }
});

module.exports = router;

