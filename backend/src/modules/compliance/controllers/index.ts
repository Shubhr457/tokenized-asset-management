import { Request, Response } from 'express';
import { IApiResponse, IUpdateComplianceRequest, IUpdateAssetStatusRequest } from '../../../interfaces';
import Asset from '../../../models/Asset';
import web3Service from '../../../core/services/web3Service';
import logger from '../../../helpers/logger';

export const setCompliance = async (req: Request, res: Response): Promise<void> => {
  try {
    const assetId = parseInt(req.params.assetId);
    const { status } = req.body as IUpdateComplianceRequest;

    const result = await web3Service.setCompliance(assetId, status);

    await Asset.updateOne(
      { assetId },
      { isCompliant: status, updatedAt: new Date() }
    );

    const response: IApiResponse<any> = {
      success: true,
      message: `Asset compliance status updated to ${status}`,
      data: { txHash: result.txHash }
    };
    res.json(response);
  } catch (error: any) {
    logger.error('Error updating compliance:', error);
    const response: IApiResponse<null> = {
      success: false,
      message: error.message || 'Error updating compliance status'
    };
    res.status(500).json(response);
  }
};

export const setAssetStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const assetId = parseInt(req.params.assetId);
    const { status } = req.body as IUpdateAssetStatusRequest;

    const statusMap: { [key: string]: number } = { 
      'Pending': 0, 
      'Active': 1, 
      'Frozen': 2, 
      'Delisted': 3 
    };

    const result = await web3Service.setAssetStatus(assetId, statusMap[status]);

    await Asset.updateOne(
      { assetId },
      { status, updatedAt: new Date() }
    );

    const response: IApiResponse<any> = {
      success: true,
      message: `Asset status updated to ${status}`,
      data: { txHash: result.txHash }
    };
    res.json(response);
  } catch (error: any) {
    logger.error('Error updating asset status:', error);
    const response: IApiResponse<null> = {
      success: false,
      message: error.message || 'Error updating asset status'
    };
    res.status(500).json(response);
  }
};

