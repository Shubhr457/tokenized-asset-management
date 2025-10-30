# Environment Variables Template

Create a `.env` file in the root directory with the following variables:

```env
# Polygon Amoy Network Configuration
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology

# Private Key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Polygonscan API Key (for contract verification)
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
```

## How to get these values:

1. **PRIVATE_KEY**: Export your private key from MetaMask or your wallet
   - MetaMask: Account Details → Show Private Key
   - ⚠️ **NEVER share your private key or commit it to version control**

2. **POLYGONSCAN_API_KEY**: 
   - Visit https://polygonscan.com/
   - Sign up/Login
   - Go to API-KEYs section
   - Create a new API key

3. **POLYGON_AMOY_RPC_URL**: 
   - Default: `https://rpc-amoy.polygon.technology`
   - You can also use alternative RPC providers like Alchemy or Infura

