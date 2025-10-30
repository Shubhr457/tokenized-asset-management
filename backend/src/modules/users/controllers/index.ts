import { Request, Response } from 'express';
import { IApiResponse, ICreateUserRequest, IBatchVerifyRequest } from '../../../interfaces';
import User from '../../../models/User';
import web3Service from '../../../core/services/web3Service';
import logger from '../../../helpers/logger';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.isVerified !== undefined) filter.isVerified = req.query.isVerified === 'true';
    if (req.query.kycStatus) filter.kycStatus = req.query.kycStatus;
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    const response: IApiResponse<any> = {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
    res.json(response);
  } catch (error: any) {
    logger.error('Error fetching users:', error);
    const response: IApiResponse<null> = {
      success: false,
      message: 'Error fetching users'
    };
    res.status(500).json(response);
  }
};

export const getUserByAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const address = req.params.address.toLowerCase();
    const user = await User.findOne({ walletAddress: address });

    if (!user) {
      const response: IApiResponse<null> = {
        success: false,
        message: 'User not found'
      };
      res.status(404).json(response);
      return;
    }

    const isVerified = await web3Service.isUserVerified(address);
    if (user.isVerified !== isVerified) {
      user.isVerified = isVerified;
      await user.save();
    }

    const response: IApiResponse<any> = {
      success: true,
      data: user
    };
    res.json(response);
  } catch (error: any) {
    logger.error('Error fetching user:', error);
    const response: IApiResponse<null> = {
      success: false,
      message: 'Error fetching user'
    };
    res.status(500).json(response);
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress, email, firstName, lastName, phone } = req.body as ICreateUserRequest;

    let user = await User.findOne({
      $or: [
        { walletAddress: walletAddress.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (user) {
      user.firstName = firstName;
      user.lastName = lastName;
      if (phone) user.phone = phone;
      await user.save();
      
      const response: IApiResponse<any> = {
        success: true,
        message: 'User updated',
        data: user
      };
      res.json(response);
      return;
    }

    user = new User({
      walletAddress: walletAddress.toLowerCase(),
      email: email.toLowerCase(),
      firstName,
      lastName,
      phone
    });

    await user.save();

    const response: IApiResponse<any> = {
      success: true,
      message: 'User created',
      data: user
    };
    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Error creating/updating user:', error);
    const response: IApiResponse<null> = {
      success: false,
      message: error.message || 'Error creating user'
    };
    res.status(500).json(response);
  }
};

export const verifyUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const address = req.params.address.toLowerCase();
    const { status } = req.body;

    const result = await web3Service.setUserVerification(address, status);

    await User.updateOne(
      { walletAddress: address },
      { isVerified: status, updatedAt: new Date() }
    );

    const response: IApiResponse<any> = {
      success: true,
      message: `User ${status ? 'verified' : 'unverified'}`,
      data: { txHash: result.txHash }
    };
    res.json(response);
  } catch (error: any) {
    logger.error('Error verifying user:', error);
    const response: IApiResponse<null> = {
      success: false,
      message: error.message || 'Error verifying user'
    };
    res.status(500).json(response);
  }
};

export const batchVerifyUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { users, status } = req.body as IBatchVerifyRequest;
    const results: any[] = [];

    for (const userAddress of users) {
      try {
        const result = await web3Service.setUserVerification(userAddress.toLowerCase(), status);
        results.push({ address: userAddress, success: true, txHash: result.txHash });
      } catch (error: any) {
        results.push({ address: userAddress, success: false, error: error.message });
      }
    }

    const response: IApiResponse<any> = {
      success: true,
      message: 'Batch verification completed',
      data: results
    };
    res.json(response);
  } catch (error: any) {
    logger.error('Error batch verifying users:', error);
    const response: IApiResponse<null> = {
      success: false,
      message: 'Error batch verifying users'
    };
    res.status(500).json(response);
  }
};

