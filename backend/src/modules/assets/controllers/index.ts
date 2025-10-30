import { Request, Response } from 'express';
import { IApiResponse, IRegisterAssetRequest, IPagination } from '../../../interfaces';
import Asset from '../../../models/Asset';
import Transaction from '../../../models/Transaction';
import web3Service from '../../../core/services/web3Service';
import logger from '../../../helpers/logger';

export const getAllAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.owner) filter.owner = (req.query.owner as string).toLowerCase();
    if (req.query.assetType) filter.assetType = req.query.assetType;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.isCompliant !== undefined) filter.isCompliant = req.query.isCompliant === 'true';

    const assets = await Asset.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-transferHistory -complianceNotes');

    const total = await Asset.countDocuments(filter);

    const response: IApiResponse<any> = {
      success: true,
      data: assets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Error fetching assets:', error);
    const response: IApiResponse<null> = {
      success: false,
      message: 'Error fetching assets'
    };
    res.status(500).json(response);
  }
};

export const getAssetById = async (req: Request, res: Response): Promise<void> => {
  try {
    const assetId = parseInt(req.params.assetId);
    
    let asset = await Asset.findOne({ assetId });
    
    if (asset) {
      try {
        const blockchainInfo = await web3Service.getAssetInfo(assetId);
        if (asset.owner.toLowerCase() !== blockchainInfo.owner.toLowerCase()) {
          asset.owner = blockchainInfo.owner.toLowerCase();
        }
        asset.isCompliant = blockchainInfo.isCompliant;
        asset.status = blockchainInfo.status as any;
        await asset.save();
      } catch (error: any) {
        logger.warn(`Could not sync asset ${assetId} with blockchain:`, error.message);
      }
    } else {
      try {
        const blockchainInfo = await web3Service.getAssetInfo(assetId);
        asset = new Asset({
          assetId,
          tokenId: assetId,
          owner: blockchainInfo.owner.toLowerCase(),
          assetType: blockchainInfo.assetType as any,
          name: '', // Will need to be updated
          metadataURI: blockchainInfo.metadataURI,
          valuation: blockchainInfo.valuation,
          isCompliant: blockchainInfo.isCompliant,
          status: blockchainInfo.status as any,
          registrationDate: blockchainInfo.registrationDate
        });
        await asset.save();
      } catch (error: any) {
        const response: IApiResponse<null> = {
          success: false,
          message: 'Asset not found'
        };
        res.status(404).json(response);
        return;
      }
    }

    const response: IApiResponse<any> = {
      success: true,
      data: asset
    };
    res.json(response);
  } catch (error: any) {
    logger.error('Error fetching asset:', error);
    const response: IApiResponse<null> = {
      success: false,
      message: 'Error fetching asset'
    };
    res.status(500).json(response);
  }
};

export const registerAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, metadataURI, assetType, valuation, name, description } = req.body as IRegisterAssetRequest;

    const isVerified = await web3Service.isUserVerified(to);
    if (!isVerified) {
      const response: IApiResponse<null> = {
        success: false,
        message: 'Recipient is not verified. Please complete KYC verification first.'
      };
      res.status(400).json(response);
      return;
    }

    const result = await web3Service.registerAsset(to, metadataURI, assetType, valuation);

    await Transaction.create({
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      from: to.toLowerCase(),
      type: 'registration',
      status: 'pending',
      eventData: { metadataURI, assetType, valuation }
    });

    const response: IApiResponse<any> = {
      success: true,
      message: 'Asset registration initiated',
      data: {
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        status: 'pending'
      }
    };
    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Error registering asset:', error);
    const response: IApiResponse<null> = {
      success: false,
      message: error.message || 'Error registering asset'
    };
    res.status(500).json(response);
  }
};

export const getAssetsByOwner = async (req: Request, res: Response): Promise<void> => {
  try {
    const address = req.params.address.toLowerCase();
    
    const assets = await Asset.find({ owner: address })
      .sort({ createdAt: -1 })
      .select('-transferHistory -complianceNotes');

    if (req.query.sync === 'true') {
      try {
        await web3Service.getAssetsByOwner(address);
      } catch (error: any) {
        logger.warn('Could not sync with blockchain:', error.message);
      }
    }

    const response: IApiResponse<any> = {
      success: true,
      data: assets
    };
    res.json(response);
  } catch (error: any) {
    logger.error('Error fetching assets by owner:', error);
    const response: IApiResponse<null> = {
      success: false,
      message: 'Error fetching assets'
    };
    res.status(500).json(response);
  }
};

export const getTransferHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const assetId = parseInt(req.params.assetId);
    const asset = await Asset.findOne({ assetId });

    if (!asset) {
      const response: IApiResponse<null> = {
        success: false,
        message: 'Asset not found'
      };
      res.status(404).json(response);
      return;
    }

    const blockchainHistory = await web3Service.getTransferHistory(assetId);

    const response: IApiResponse<any> = {
      success: true,
      data: {
        database: asset.transferHistory,
        blockchain: blockchainHistory
      }
    };
    res.json(response);
  } catch (error: any) {
    logger.error('Error fetching transfer history:', error);
    const response: IApiResponse<null> = {
      success: false,
      message: 'Error fetching transfer history'
    };
    res.status(500).json(response);
  }
};

