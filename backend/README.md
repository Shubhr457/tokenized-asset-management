# Tokenized Asset Management API

Backend API server for managing tokenized assets on Polygon blockchain. Built with TypeScript, Express, and MongoDB.

## Project Structure

```
backend/
├── src/
│   ├── @types/              # TypeScript type definitions
│   ├── abis/                # Contract ABIs
│   ├── core/                # Core functionality
│   │   ├── config/         # Configuration files
│   │   └── services/       # Core services (web3, event listeners)
│   ├── environments/        # Environment configuration
│   ├── helpers/             # Helper functions (logger, notifications)
│   ├── interfaces/          # TypeScript interfaces
│   ├── middlewares/         # Express middlewares
│   ├── models/              # MongoDB models
│   ├── modules/             # Feature modules
│   │   ├── assets/         # Asset management module
│   │   │   ├── controllers/
│   │   │   ├── dtos/
│   │   │   └── routes/
│   │   ├── users/         # User management module
│   │   │   ├── controllers/
│   │   │   ├── dtos/
│   │   │   └── routes/
│   │   └── compliance/    # Compliance module
│   │       ├── controllers/
│   │       ├── dtos/
│   │       └── routes/
│   └── server.ts           # Application entry point
├── dist/                    # Compiled JavaScript (generated)
├── logs/                    # Application logs
├── tsconfig.json           # TypeScript configuration
└── package.json
```

## Features

- **TypeScript**: Full type safety and modern ES6+ features
- **Modular Architecture**: Feature-based modules with controllers, DTOs, and routes
- **Asset Management**: Register, track, and manage tokenized assets
- **User Management**: KYC/AML verification and user onboarding
- **Compliance**: Asset compliance and status management
- **Event Listening**: Real-time blockchain event synchronization
- **Off-chain Metadata**: Store documents, images, and additional asset data
- **Transaction Tracking**: Monitor all blockchain transactions

## Prerequisites

- Node.js 16+
- MongoDB 4.4+
- TypeScript 5.3+
- Polygon Amoy testnet account with deployed contract

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - MongoDB connection string
   - Contract address (from deployment)
   - Private key for contract interactions
   - JWT secret for authentication
   - Email credentials (optional, for notifications)

4. Start MongoDB:
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or use your existing MongoDB instance
```

5. Create logs directory:
```bash
mkdir logs
```

## Running the Server

### Development
```bash
npm run dev
```
Runs with `ts-node-dev` for hot reloading.

### Build for Production
```bash
npm run build
npm start
```

### Other Commands
```bash
npm run lint    # Lint TypeScript files
npm run clean   # Remove dist folder
npm test        # Run tests
```

Server will start on `http://localhost:3000`

## API Endpoints

### Assets
- `GET /api/assets` - Get all assets (with pagination and filters)
- `GET /api/assets/:assetId` - Get asset by ID
- `POST /api/assets/register` - Register new asset
- `GET /api/assets/owner/:address` - Get assets by owner
- `GET /api/assets/:assetId/transfers` - Get transfer history

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:address` - Get user by wallet address
- `POST /api/users` - Create or update user
- `POST /api/users/:address/verify` - Verify/unverify user
- `POST /api/users/batch-verify` - Batch verify users

### Compliance
- `POST /api/compliance/assets/:assetId/compliance` - Set asset compliance
- `POST /api/compliance/assets/:assetId/status` - Set asset status

## Module Structure

Each module follows this structure:
- **controllers/**: Business logic and request handling
- **dtos/**: Data Transfer Objects and validation rules
- **routes/**: Express route definitions

Example:
```
modules/assets/
├── controllers/
│   └── index.ts       # Controller functions
├── dtos/
│   └── index.ts       # Validation schemas
└── routes/
    └── index.ts       # Route definitions
```

## Environment Variables

See `.env.example` for all available configuration options.

## TypeScript Configuration

- `tsconfig.json`: TypeScript compiler configuration
- Path aliases configured for easier imports:
  - `@/*` → `src/*`
  - `@core/*` → `src/core/*`
  - `@modules/*` → `src/modules/*`

## Database Models

- **User**: User accounts with KYC status
- **Asset**: Tokenized assets with metadata
- **Transaction**: Blockchain transaction records

## Event Listeners

The server automatically listens to blockchain events:
- `AssetRegistered` - Syncs new asset registrations
- `AssetTransferred` - Updates ownership and transfer history
- `ComplianceUpdated` - Updates compliance status
- `AssetStatusChanged` - Updates asset status
- `UserVerified` - Updates user verification status

## Security

- Helmet.js for security headers
- Rate limiting on API endpoints
- Input validation with express-validator
- CORS configuration
- Type-safe request/response handling

## Logging

Logs are written to:
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs

## License

MIT
