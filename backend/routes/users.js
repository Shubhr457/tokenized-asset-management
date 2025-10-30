const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const User = require('../models/User');
const web3Service = require('../services/web3Service');
const logger = require('../utils/logger');

// Create or update user
router.post('/', [
  body('walletAddress').isEthereumAddress(),
  body('email').isEmail(),
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('phone').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { walletAddress, email, firstName, lastName, phone } = req.body;

    // Check if user exists
    let user = await User.findOne({ 
      $or: [
        { walletAddress: walletAddress.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (user) {
      // Update existing user
      user.firstName = firstName;
      user.lastName = lastName;
      if (phone) user.phone = phone;
      await user.save();
      
      return res.json({ 
        success: true, 
        message: 'User updated',
        data: user 
      });
    }

    // Create new user
    user = new User({
      walletAddress: walletAddress.toLowerCase(),
      email: email.toLowerCase(),
      firstName,
      lastName,
      phone
    });

    await user.save();

    res.status(201).json({ 
      success: true, 
      message: 'User created',
      data: user 
    });
  } catch (error) {
    logger.error('Error creating/updating user:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error creating user' 
    });
  }
});

// Get user by wallet address
router.get('/:address', [
  param('address').isEthereumAddress()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const address = req.params.address.toLowerCase();
    const user = await User.findOne({ walletAddress: address });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check verification status on blockchain
    const isVerified = await web3Service.isUserVerified(address);
    if (user.isVerified !== isVerified) {
      user.isVerified = isVerified;
      await user.save();
    }

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Error fetching user' });
  }
});

// Verify user (requires COMPLIANCE_ROLE)
router.post('/:address/verify', [
  param('address').isEthereumAddress(),
  body('status').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const address = req.params.address.toLowerCase();
    const { status } = req.body;

    // Verify on blockchain
    const result = await web3Service.setUserVerification(address, status);

    // Update database
    await User.updateOne(
      { walletAddress: address },
      { isVerified: status, updatedAt: new Date() }
    );

    res.json({ 
      success: true, 
      message: `User ${status ? 'verified' : 'unverified'}`,
      data: { txHash: result.txHash }
    });
  } catch (error) {
    logger.error('Error verifying user:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error verifying user' 
    });
  }
});

// Get all users with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.isVerified !== undefined) filter.isVerified = req.query.isVerified === 'true';
    if (req.query.kycStatus) filter.kycStatus = req.query.kycStatus;
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

module.exports = router;

