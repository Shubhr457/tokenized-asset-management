import { ethers } from 'ethers';
import web3Service from './web3Service';
import Asset from '../../models/Asset';
import Transaction from '../../models/Transaction';
import User from '../../models/User';
import logger from '../../helpers/logger';
import { sendNotification } from '../../helpers/notificationService';

let eventListeners: any[] = [];

export async function startEventListeners(): Promise<void> {
  try {
    await web3Service.initialize();
    const contract = web3Service.getContract();

    // AssetRegistered event listener
    const assetRegisteredListener = contract.on('AssetRegistered', async (owner: string, assetId: any, assetType: string, metadataURI: string, valuation: any, event: any) => {
      try {
        logger.info(`AssetRegistered event received: AssetId=${assetId}, Owner=${owner}`);
        
        const assetInfo = await web3Service.getAssetInfo(Number(assetId));
        
        const asset = new Asset({
          assetId: Number(assetId),
          tokenId: Number(assetId),
          owner: owner.toLowerCase(),
          assetType: assetType as any,
          metadataURI: metadataURI,
          valuation: ethers.formatEther(valuation),
          isCompliant: assetInfo.isCompliant,
          status: assetInfo.status as any,
          registrationDate: assetInfo.registrationDate
        });
        
        await asset.save();
        logger.info(`Asset ${assetId} saved to database`);

        await Transaction.create({
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          from: event.args.owner,
          assetId: Number(assetId),
          tokenId: Number(assetId),
          type: 'registration',
          status: 'confirmed',
          eventData: {
            assetType,
            metadataURI,
            valuation: valuation.toString()
          },
          confirmedAt: new Date()
        });

        const user = await User.findOne({ walletAddress: owner.toLowerCase() });
        if (user) {
          await sendNotification(user.email, 'Asset Registered', `Your asset (ID: ${assetId}) has been successfully registered.`);
        }
      } catch (error: any) {
        logger.error('Error processing AssetRegistered event:', error);
      }
    });

    // AssetTransferred event listener
    const assetTransferredListener = contract.on('AssetTransferred', async (from: string, to: string, assetId: any, price: any, event: any) => {
      try {
        logger.info(`AssetTransferred event received: AssetId=${assetId}, From=${from}, To=${to}`);
        
        const asset = await Asset.findOne({ assetId: Number(assetId) });
        if (asset) {
          asset.owner = to.toLowerCase();
          asset.addTransfer(from.toLowerCase(), to.toLowerCase(), price.toString(), event.transactionHash);
          await asset.save();
        }

        await Transaction.create({
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          from: from.toLowerCase(),
          to: to.toLowerCase(),
          assetId: Number(assetId),
          tokenId: Number(assetId),
          type: 'transfer',
          status: 'confirmed',
          eventData: {
            price: price.toString()
          },
          confirmedAt: new Date()
        });

        const fromUser = await User.findOne({ walletAddress: from.toLowerCase() });
        const toUser = await User.findOne({ walletAddress: to.toLowerCase() });
        
        if (fromUser) {
          await sendNotification(fromUser.email, 'Asset Transferred', `Your asset (ID: ${assetId}) has been transferred.`);
        }
        if (toUser) {
          await sendNotification(toUser.email, 'Asset Received', `You have received asset (ID: ${assetId}).`);
        }
      } catch (error: any) {
        logger.error('Error processing AssetTransferred event:', error);
      }
    });

    // ComplianceUpdated event listener
    const complianceUpdatedListener = contract.on('ComplianceUpdated', async (assetId: any, isCompliant: boolean, event: any) => {
      try {
        logger.info(`ComplianceUpdated event received: AssetId=${assetId}, Compliant=${isCompliant}`);
        
        await Asset.updateOne(
          { assetId: Number(assetId) },
          { isCompliant, updatedAt: new Date() }
        );

        await Transaction.create({
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          assetId: Number(assetId),
          type: 'compliance_update',
          status: 'confirmed',
          eventData: { isCompliant },
          confirmedAt: new Date()
        });
      } catch (error: any) {
        logger.error('Error processing ComplianceUpdated event:', error);
      }
    });

    // AssetStatusChanged event listener
    const statusChangedListener = contract.on('AssetStatusChanged', async (assetId: any, newStatus: number, event: any) => {
      try {
        const statusMap: { [key: number]: string } = { 0: 'Pending', 1: 'Active', 2: 'Frozen', 3: 'Delisted' };
        logger.info(`AssetStatusChanged event received: AssetId=${assetId}, Status=${statusMap[newStatus]}`);
        
        await Asset.updateOne(
          { assetId: Number(assetId) },
          { status: statusMap[newStatus], updatedAt: new Date() }
        );

        await Transaction.create({
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          assetId: Number(assetId),
          type: 'status_change',
          status: 'confirmed',
          eventData: { newStatus: statusMap[newStatus] },
          confirmedAt: new Date()
        });
      } catch (error: any) {
        logger.error('Error processing AssetStatusChanged event:', error);
      }
    });

    // UserVerified event listener
    const userVerifiedListener = contract.on('UserVerified', async (user: string, status: boolean, event: any) => {
      try {
        logger.info(`UserVerified event received: User=${user}, Verified=${status}`);
        
        await User.updateOne(
          { walletAddress: user.toLowerCase() },
          { isVerified: status, updatedAt: new Date() }
        );
      } catch (error: any) {
        logger.error('Error processing UserVerified event:', error);
      }
    });

    eventListeners = [
      assetRegisteredListener,
      assetTransferredListener,
      complianceUpdatedListener,
      statusChangedListener,
      userVerifiedListener
    ];

    logger.info('Event listeners started successfully');
  } catch (error: any) {
    logger.error('Failed to start event listeners:', error);
    throw error;
  }
}

export function stopEventListeners(): void {
  eventListeners.forEach(listener => {
    if (listener && typeof listener.removeAllListeners === 'function') {
      listener.removeAllListeners();
    }
  });
  eventListeners = [];
  logger.info('Event listeners stopped');
}

