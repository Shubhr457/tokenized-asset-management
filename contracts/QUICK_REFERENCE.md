# Quick Reference: New Contract Features

## Emergency Pause Functions

### Pause Contract
```javascript
// Only ADMIN_ROLE can call
await contract.pause();
// Emits: ContractPaused(address indexed by)
```

**What it does:**
- Blocks all asset transfers (transferFrom, safeTransferFrom, transferWithPrice)
- Allows minting to continue (for emergency admin operations)
- Prevents potential exploits during security incidents

### Unpause Contract
```javascript
// Only ADMIN_ROLE can call
await contract.unpause();
// Emits: ContractUnpaused(address indexed by)
```

### Check Pause Status
```javascript
const isPaused = await contract.paused();
// Returns: boolean (true if paused, false if active)
```

---

## Batch User Verification

### Batch Verify Users
```javascript
// Only COMPLIANCE_ROLE can call
const users = [
  "0x1234...",
  "0x5678...",
  "0x9abc..."
];

await contract.batchVerifyUsers(users, true);  // Verify
await contract.batchVerifyUsers(users, false); // Unverify

// Emits for each user: UserVerified(address indexed user, bool status)
// Emits at end: BatchVerificationCompleted(uint256 count, bool status)
```

**Limits:**
- Maximum: 100 users per batch
- Minimum: 1 user (empty arrays rejected)

**Error Messages:**
- `"Empty array"` - Array has no users
- `"Batch too large"` - More than 100 users

---

## Transfer History Tracking

### Transfer with Price
```javascript
// Records price in transfer history
await contract.connect(owner).transferWithPrice(
  fromAddress,
  toAddress,
  assetId,
  ethers.parseEther("50.0") // Price in wei
);
// Emits: AssetTransferred(from, to, assetId, price)
```

### Standard Transfer
```javascript
// Records transfer with price = 0
await contract.connect(owner).transferFrom(
  fromAddress,
  toAddress,
  assetId
);
// Also recorded in transfer history (price = 0)
```

### View Transfer History
```javascript
const history = await contract.getTransferHistory(assetId);

// Returns array of TransferRecord:
// {
//   from: address,
//   to: address,
//   timestamp: uint256,
//   price: uint256
// }
```

**Key Features:**
- ✅ No duplicate records
- ✅ Accurate timestamp tracking
- ✅ Price tracking for secondary market
- ✅ Complete provenance chain

---

## Constants

```javascript
// Batch operation limit
const MAX_BATCH_SIZE = await contract.MAX_BATCH_SIZE();
// Returns: 100

// Role identifiers
const ADMIN_ROLE = await contract.ADMIN_ROLE();
const MINTER_ROLE = await contract.MINTER_ROLE();
const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
```

---

## Complete Workflow Example

### 1. Initial Setup
```javascript
// Grant roles
await contract.grantRole(COMPLIANCE_ROLE, complianceOfficer.address);
await contract.grantRole(MINTER_ROLE, minter.address);
```

### 2. Verify Users (Batch)
```javascript
const newUsers = [user1.address, user2.address, user3.address];
await contract.connect(complianceOfficer).batchVerifyUsers(newUsers, true);
```

### 3. Register Asset
```javascript
await contract.connect(minter).registerAsset(
  user1.address,
  "ipfs://QmXYZ...",
  "property",
  ethers.parseEther("100")
);
// Asset starts in Pending status, not compliant
```

### 4. Activate Asset
```javascript
// Set compliance
await contract.connect(complianceOfficer).setCompliance(assetId, true);

// Set status to Active
await contract.setAssetStatus(assetId, 1); // 1 = Active
```

### 5. Transfer Asset
```javascript
// With price tracking
await contract.connect(user1).transferWithPrice(
  user1.address,
  user2.address,
  assetId,
  ethers.parseEther("50")
);

// Or standard transfer
await contract.connect(user1).transferFrom(
  user1.address,
  user2.address,
  assetId
);
```

### 6. Emergency Pause (if needed)
```javascript
// In case of security incident
await contract.connect(admin).pause();

// Investigate and fix issue...

// Resume operations
await contract.connect(admin).unpause();
```

### 7. View History
```javascript
const history = await contract.getTransferHistory(assetId);
console.log(`Asset has ${history.length} transfers`);

for (const record of history) {
  console.log(`${record.from} -> ${record.to} @ ${record.price} wei`);
}
```

---

## Error Messages Reference

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `"Empty array"` | Batch operation with 0 users | Provide at least 1 user |
| `"Batch too large"` | More than 100 users | Split into multiple batches |
| `"Asset not compliant"` | Trying to transfer non-compliant asset | Set compliance first |
| `"Asset not active"` | Asset is Pending/Frozen/Delisted | Change status to Active |
| `"Recipient not verified"` | Transferring to unverified user | Verify recipient first |
| `"Not authorized"` | Not owner/approved | Get approval or use owner account |
| `EnforcedPause` | Contract is paused | Wait for unpause |
| `"Asset does not exist"` | Invalid asset ID | Check asset ID exists |

---

## Gas Estimates

| Operation | Gas Cost (approx) |
|-----------|------------------|
| Pause | ~30,000 |
| Unpause | ~15,000 |
| Batch verify (1 user) | ~50,000 |
| Batch verify (100 users) | ~3,500,000 |
| Transfer with price | ~120,000 |
| Standard transfer | ~115,000 |

*Note: Gas costs vary based on network conditions and storage usage*

---

## Best Practices

### For Admins
1. ✅ Grant roles to dedicated accounts (not EOAs)
2. ✅ Use multi-sig wallet for ADMIN_ROLE
3. ✅ Test pause/unpause in testnet first
4. ✅ Monitor events for unusual activity
5. ✅ Have emergency procedures documented

### For Compliance Officers
1. ✅ Verify users before asset registration
2. ✅ Use batch operations for efficiency
3. ✅ Keep records of verification off-chain
4. ✅ Review transfer history regularly
5. ✅ Update compliance status promptly

### For Minters
1. ✅ Verify recipient before minting
2. ✅ Include detailed metadata URIs
3. ✅ Set appropriate valuations
4. ✅ Coordinate with compliance team
5. ✅ Test on testnet first

### For Users
1. ✅ Complete KYC verification first
2. ✅ Wait for asset activation before transfer
3. ✅ Use transferWithPrice for price tracking
4. ✅ Keep records of transaction hashes
5. ✅ Verify recipient is verified

---

## Events to Monitor

```javascript
// Contract pause events
event ContractPaused(address indexed by);
event ContractUnpaused(address indexed by);

// Batch operation events
event BatchVerificationCompleted(uint256 count, bool status);
event UserVerified(address indexed user, bool status);

// Asset events
event AssetRegistered(address indexed owner, uint256 indexed assetId, ...);
event AssetTransferred(address indexed from, address indexed to, uint256 indexed assetId, uint256 price);
event ComplianceUpdated(uint256 indexed assetId, bool isCompliant);
event AssetStatusChanged(uint256 indexed assetId, AssetStatus newStatus);
```

---

## Security Checklist

Before going live:
- [ ] All roles assigned to correct addresses
- [ ] Multi-sig wallet for ADMIN_ROLE
- [ ] Pause/unpause tested
- [ ] Batch operations tested with max size
- [ ] Transfer history verified
- [ ] Emergency procedures documented
- [ ] Team trained on pause functionality
- [ ] Monitoring alerts configured
- [ ] Professional audit completed
- [ ] Bug bounty program active

---

**Version:** 2.0 (with Pausable & Enhanced Transfer History)  
**Last Updated:** October 31, 2025  
**Contract:** AssetTokenization.sol
