const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const Asset = require('../models/Asset');
const web3Service = require('../services/web3Service');
const logger = require('../utils/logger');

// Set asset compliance status
router.post('/assets/:assetId/compliance', [
  param('assetId').isInt({ min: 0 }),
  body('status').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const assetId = parseInt(req.params.assetId);
    const { status } = req.body;

    // Update on blockchain
    const result = await web3Service.setCompliance(assetId, status);

    // Update database
    await Asset.updateOne(
      { assetId },
      { isCompliant: status, updatedAt: new Date() }
    );

    res.json({ 
      success: true, 
      message: `Asset compliance status updated to ${status}`,
      data: { txHash: result.txHash }
    });
  } catch (error) {
    logger.error('Error updating compliance:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error updating compliance status' 
    });
  }
});

// Set asset status
router.post('/assets/:assetId/status', [
  param('assetId').isInt({ min: 0 }),
  body('status').isIn(['Pending', 'Active', 'Frozen', 'Delisted'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const assetId = parseInt(req.params.assetId);
    const { status } = req.body;

    const statusMap = { 'Pending': 0, 'Active': 1, 'Frozen': 2, 'Delisted': 3 };

    // Update on blockchain
    const result = await web3Service.setAssetStatus(assetId, statusMap[status]);

    // Update database
    await Asset.updateOne(
      { assetId },
      { status, updatedAt: new Date() }
    );

    res.json({ 
      success: true, 
      message: `Asset status updated to ${status}`,
      data: { txHash: result.txHash }
    });
  } catch (error) {
    logger.error('Error updating asset status:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error updating asset status' 
    });
  }
});

// Batch verify users
router.post('/users/batch-verify', [
  body('users').isArray({ min: 1 }),
  body('users.*').isEthereumAddress(),
  body('status').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { users, status } = req.body;
    const results = [];

    for (const userAddress of users) {
      try {
        const result = await web3Service.setUserVerification(userAddress.toLowerCase(), status);
        results.push({ address: userAddress, success: true, txHash: result.txHash });
      } catch (error) {
        results.push({ address: userAddress, success: false, error: error.message });
      }
    }

    res.json({ 
      success: true, 
      message: 'Batch verification completed',
      data: results 
    });
  } catch (error) {
    logger.error('Error batch verifying users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error batch verifying users' 
    });
  }
});

module.exports = router;

