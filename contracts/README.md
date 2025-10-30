# Tokenized Asset Management

Smart contract project for tokenized asset management, deployed on Polygon Amoy testnet.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Polygon Amoy testnet account with test MATIC

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
```

**Important**: Never commit your `.env` file! Your private key should remain secret.

3. Get test MATIC from Polygon Amoy faucet:
   - Visit: https://faucet.polygon.technology/
   - Select "Polygon Amoy" network
   - Request test tokens

## Usage

### Compile Contracts
```bash
npm run compile
```

### Deploy to Polygon Amoy
```bash
npm run deploy:amoy
```

### Verify Contract on Polygonscan
```bash
npm run verify:amoy <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Project Structure

```
├── contracts/          # Smart contract source files
├── scripts/            # Deployment and utility scripts
├── test/              # Test files
├── hardhat.config.js  # Hardhat configuration
└── package.json       # Project dependencies
```

## Network Information

- **Network Name**: Polygon Amoy
- **Chain ID**: 80002
- **RPC URL**: https://rpc-amoy.polygon.technology
- **Explorer**: https://amoy.polygonscan.com/

## Next Steps

1. Add your smart contract files to the `contracts/` directory
2. Update `scripts/deploy.js` with your contract deployment logic
3. Test locally using Hardhat network: `npx hardhat test`
4. Deploy to Polygon Amoy: `npm run deploy:amoy`