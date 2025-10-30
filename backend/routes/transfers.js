const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const Transaction = require('../models/Transaction');
const Asset = require('../models/Asset');
const logger = require('../utils/logger');

// Get all transactions with filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.from) filter.from = req.query.from.toLowerCase();
    if (req.query.to) filter.to = req.query.to.toLowerCase();
    if (req.query.assetId) filter.assetId = parseInt(req.query.assetId);
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Error fetching transactions' });
  }
});

// Get transaction by hash
router.get('/:txHash', [
  param('txHash').matches(/^0x[a-fA-F0-9]{64}$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transaction = await Transaction.findOne({ txHash: req.params.txHash });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    logger.error('Error fetching transaction:', error);
    res.status(500).json({ success: false, message: 'Error fetching transaction' });
  }
});

module.exports = router;

