import { ethers } from 'ethers';
import { Contract } from 'ethers';
import logger from '../../helpers/logger';
import { env } from '../../environments';
import { loadContractABI } from '../../abis';

class Web3Service {
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: Contract | null = null;
  private contractWithSigner: Contract | null = null;
  private signer: ethers.Wallet | null = null;
  private contractAddress: string = '';

  async initialize(): Promise<boolean> {
    try {
      const rpcUrl = env.POLYGON_AMOY_RPC_URL;
      this.contractAddress = env.CONTRACT_ADDRESS;

      if (!this.contractAddress) {
        throw new Error('CONTRACT_ADDRESS not set in environment variables');
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      logger.info('Web3 provider initialized');

      const contractABI = loadContractABI();

      this.contract = new ethers.Contract(
        this.contractAddress,
        contractABI.abi,
        this.provider
      );

      if (env.PRIVATE_KEY) {
        this.signer = new ethers.Wallet(env.PRIVATE_KEY, this.provider);
        this.contractWithSigner = new ethers.Contract(
          this.contractAddress,
          contractABI.abi,
          this.signer
        );
        logger.info('Web3 signer initialized');
      }

      return true;
    } catch (error: any) {
      logger.error('Failed to initialize Web3 service:', error);
      throw error;
    }
  }

  private checkInitialized(): void {
    if (!this.contract) {
      throw new Error('Web3 service not initialized. Call initialize() first.');
    }
  }

  getContract(): Contract {
    this.checkInitialized();
    return this.contract!;
  }

  getContractWithSigner(): Contract {
    this.checkInitialized();
    if (!this.contractWithSigner) {
      throw new Error('Signer not available. PRIVATE_KEY not set.');
    }
    return this.contractWithSigner;
  }

  getProvider(): ethers.JsonRpcProvider {
    this.checkInitialized();
    return this.provider!;
  }

  async registerAsset(to: string, metadataURI: string, assetType: string, valuation: number) {
    try {
      const contract = this.getContractWithSigner();
      const tx = await contract.registerAsset(
        to,
        metadataURI,
        assetType,
        ethers.parseEther(valuation.toString())
      );

      logger.info(`Asset registration transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error: any) {
      logger.error('Error registering asset:', error);
      throw error;
    }
  }

  async getAssetInfo(assetId: number) {
    try {
      const contract = this.getContract();
      const info = await contract.getAssetInfo(assetId);
      
      const statusMap: { [key: number]: string } = { 
        0: 'Pending', 
        1: 'Active', 
        2: 'Frozen', 
        3: 'Delisted' 
      };
      
      return {
        metadataURI: info[0],
        isCompliant: info[1],
        status: statusMap[Number(info[2])] || 'Pending',
        valuation: ethers.formatEther(info[3]),
        registrationDate: new Date(Number(info[4]) * 1000),
        assetType: info[5],
        owner: info[6]
      };
    } catch (error: any) {
      logger.error(`Error getting asset info for ID ${assetId}:`, error);
      throw error;
    }
  }

  async isUserVerified(address: string): Promise<boolean> {
    try {
      const contract = this.getContract();
      return await contract.verifiedUsers(address);
    } catch (error: any) {
      logger.error(`Error checking user verification for ${address}:`, error);
      throw error;
    }
  }

  async setUserVerification(user: string, status: boolean) {
    try {
      const contract = this.getContractWithSigner();
      const tx = await contract.setUserVerification(user, status);
      await tx.wait();
      return { txHash: tx.hash, success: true };
    } catch (error: any) {
      logger.error('Error setting user verification:', error);
      throw error;
    }
  }

  async setCompliance(assetId: number, status: boolean) {
    try {
      const contract = this.getContractWithSigner();
      const tx = await contract.setCompliance(assetId, status);
      await tx.wait();
      return { txHash: tx.hash, success: true };
    } catch (error: any) {
      logger.error(`Error setting compliance for asset ${assetId}:`, error);
      throw error;
    }
  }

  async setAssetStatus(assetId: number, status: number) {
    try {
      const contract = this.getContractWithSigner();
      const tx = await contract.setAssetStatus(assetId, status);
      await tx.wait();
      return { txHash: tx.hash, success: true };
    } catch (error: any) {
      logger.error(`Error setting asset status for ${assetId}:`, error);
      throw error;
    }
  }

  async getTransferHistory(assetId: number) {
    try {
      const contract = this.getContract();
      const history = await contract.getTransferHistory(assetId);
      
      return history.map((record: any) => ({
        from: record.from,
        to: record.to,
        timestamp: new Date(Number(record.timestamp) * 1000),
        price: ethers.formatEther(record.price)
      }));
    } catch (error: any) {
      logger.error(`Error getting transfer history for asset ${assetId}:`, error);
      throw error;
    }
  }

  async getAssetsByOwner(owner: string): Promise<number[]> {
    try {
      const contract = this.getContract();
      const tokenIds = await contract.getAssetsByOwner(owner);
      return tokenIds.map((id: any) => Number(id));
    } catch (error: any) {
      logger.error(`Error getting assets for owner ${owner}:`, error);
      throw error;
    }
  }
}

const web3Service = new Web3Service();
export default web3Service;

