const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Load contract ABI - try multiple possible paths
let AssetTokenizationABI;
try {
  // Try relative path from backend directory
  const abiPath = path.join(__dirname, '../../contracts/artifacts/contracts/token-managemnt.sol/AssetTokenization.json');
  AssetTokenizationABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
} catch (error) {
  logger.warn('Could not load contract ABI from file. Using hardcoded ABI.');
  // Fallback: You'll need to provide the ABI or contract address
  AssetTokenizationABI = { abi: [] };
}

class Web3Service {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.signer = null;
    this.contractAddress = null;
  }

  async initialize() {
    try {
      const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
      this.contractAddress = process.env.CONTRACT_ADDRESS;

      if (!this.contractAddress) {
        throw new Error('CONTRACT_ADDRESS not set in environment variables');
      }

      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      logger.info('Web3 provider initialized');

      // Initialize contract (read-only)
      this.contract = new ethers.Contract(
        this.contractAddress,
        AssetTokenizationABI.abi,
        this.provider
      );

      // Initialize signer if private key is provided
      if (process.env.PRIVATE_KEY) {
        this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        this.contractWithSigner = new ethers.Contract(
          this.contractAddress,
          AssetTokenizationABI.abi,
          this.signer
        );
        logger.info('Web3 signer initialized');
      }

      return true;
    } catch (error) {
      logger.error('Failed to initialize Web3 service:', error);
      throw error;
    }
  }

  // Check if service is initialized
  checkInitialized() {
    if (!this.contract) {
      throw new Error('Web3 service not initialized. Call initialize() first.');
    }
  }

  // Get contract instance (read-only)
  getContract() {
    this.checkInitialized();
    return this.contract;
  }

  // Get contract instance with signer (for transactions)
  getContractWithSigner() {
    this.checkInitialized();
    if (!this.contractWithSigner) {
      throw new Error('Signer not available. PRIVATE_KEY not set.');
    }
    return this.contractWithSigner;
  }

  // Get provider
  getProvider() {
    this.checkInitialized();
    return this.provider;
  }

  // Register asset on blockchain
  async registerAsset(to, metadataURI, assetType, valuation) {
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
    } catch (error) {
      logger.error('Error registering asset:', error);
      throw error;
    }
  }

  // Get asset info from blockchain
  async getAssetInfo(assetId) {
    try {
      const contract = this.getContract();
      const info = await contract.getAssetInfo(assetId);
      
      // Map status enum to string
      const statusMap = { 0: 'Pending', 1: 'Active', 2: 'Frozen', 3: 'Delisted' };
      
      return {
        metadataURI: info[0],
        isCompliant: info[1],
        status: statusMap[Number(info[2])] || 'Pending',
        valuation: ethers.formatEther(info[3]),
        registrationDate: new Date(Number(info[4]) * 1000),
        assetType: info[5],
        owner: info[6]
      };
    } catch (error) {
      logger.error(`Error getting asset info for ID ${assetId}:`, error);
      throw error;
    }
  }

  // Check if user is verified
  async isUserVerified(address) {
    try {
      const contract = this.getContract();
      return await contract.verifiedUsers(address);
    } catch (error) {
      logger.error(`Error checking user verification for ${address}:`, error);
      throw error;
    }
  }

  // Set user verification (requires COMPLIANCE_ROLE)
  async setUserVerification(user, status) {
    try {
      const contract = this.getContractWithSigner();
      const tx = await contract.setUserVerification(user, status);
      await tx.wait();
      return { txHash: tx.hash, success: true };
    } catch (error) {
      logger.error('Error setting user verification:', error);
      throw error;
    }
  }

  // Set compliance status
  async setCompliance(assetId, status) {
    try {
      const contract = this.getContractWithSigner();
      const tx = await contract.setCompliance(assetId, status);
      await tx.wait();
      return { txHash: tx.hash, success: true };
    } catch (error) {
      logger.error(`Error setting compliance for asset ${assetId}:`, error);
      throw error;
    }
  }

  // Set asset status
  async setAssetStatus(assetId, status) {
    try {
      const contract = this.getContractWithSigner();
      const tx = await contract.setAssetStatus(assetId, status);
      await tx.wait();
      return { txHash: tx.hash, success: true };
    } catch (error) {
      logger.error(`Error setting asset status for ${assetId}:`, error);
      throw error;
    }
  }

  // Update valuation
  async updateValuation(assetId, newValuation) {
    try {
      const contract = this.getContractWithSigner();
      const tx = await contract.updateValuation(
        assetId,
        ethers.parseEther(newValuation.toString())
      );
      await tx.wait();
      return { txHash: tx.hash, success: true };
    } catch (error) {
      logger.error(`Error updating valuation for asset ${assetId}:`, error);
      throw error;
    }
  }

  // Get transfer history
  async getTransferHistory(assetId) {
    try {
      const contract = this.getContract();
      const history = await contract.getTransferHistory(assetId);
      
      return history.map(record => ({
        from: record.from,
        to: record.to,
        timestamp: new Date(Number(record.timestamp) * 1000),
        price: ethers.formatEther(record.price)
      }));
    } catch (error) {
      logger.error(`Error getting transfer history for asset ${assetId}:`, error);
      throw error;
    }
  }

  // Get assets by owner
  async getAssetsByOwner(owner) {
    try {
      const contract = this.getContract();
      const tokenIds = await contract.getAssetsByOwner(owner);
      return tokenIds.map(id => Number(id));
    } catch (error) {
      logger.error(`Error getting assets for owner ${owner}:`, error);
      throw error;
    }
  }

  // Get transaction receipt
  async getTransactionReceipt(txHash) {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      logger.error(`Error getting transaction receipt for ${txHash}:`, error);
      throw error;
    }
  }
}

// Singleton instance
const web3Service = new Web3Service();

module.exports = web3Service;

