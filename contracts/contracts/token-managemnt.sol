// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AssetTokenization is ERC721, AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    
    // Asset lifecycle states
    enum AssetStatus { Pending, Active, Frozen, Delisted }
    
    // Asset metadata and compliance
    struct AssetInfo {
        string metadataURI;
        bool isCompliant;
        AssetStatus status;
        uint256 valuation;          // Asset value in wei
        uint256 registrationDate;
        string assetType;            // "property", "share", "collectible"
    }
    
    // Transfer history for provenance tracking
    struct TransferRecord {
        address from;
        address to;
        uint256 timestamp;
        uint256 price;
    }
    
    mapping(uint256 => AssetInfo) public assetDetails;
    mapping(uint256 => TransferRecord[]) public transferHistory;
    mapping(address => bool) public verifiedUsers;
    
    uint256 private _nextTokenId;
    
    // Events
    event AssetRegistered(
        address indexed owner, 
        uint256 indexed assetId, 
        string assetType,
        string metadataURI,
        uint256 valuation
    );
    event AssetTransferred(
        address indexed from, 
        address indexed to, 
        uint256 indexed assetId,
        uint256 price
    );
    event ComplianceUpdated(uint256 indexed assetId, bool isCompliant);
    event AssetStatusChanged(uint256 indexed assetId, AssetStatus newStatus);
    event MetadataUpdated(uint256 indexed assetId, string newMetadataURI);
    event UserVerified(address indexed user, bool status);
    event ValuationUpdated(uint256 indexed assetId, uint256 newValuation);
    
    constructor(string memory name, string memory symbol) 
        ERC721(name, symbol) 
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
        
        // Admin is automatically verified
        verifiedUsers[msg.sender] = true;
    }
    
    // Register and mint new asset with full details
    function registerAsset(
        address to,
        string memory metadataURI,
        string memory assetType,
        uint256 valuation
    ) public onlyRole(MINTER_ROLE) returns (uint256) {
        require(verifiedUsers[to], "Recipient not verified");
        
        uint256 assetId = _nextTokenId++;
        _safeMint(to, assetId);
        
        assetDetails[assetId] = AssetInfo({
            metadataURI: metadataURI,
            isCompliant: false,
            status: AssetStatus.Pending,
            valuation: valuation,
            registrationDate: block.timestamp,
            assetType: assetType
        });
        
        emit AssetRegistered(to, assetId, assetType, metadataURI, valuation);
        return assetId;
    }
    
    // User KYC/AML verification
    function setUserVerification(address user, bool status) 
        public 
        onlyRole(COMPLIANCE_ROLE) 
    {
        verifiedUsers[user] = status;
        emit UserVerified(user, status);
    }
    
    // Batch verify multiple users
    function batchVerifyUsers(address[] calldata users, bool status) 
        public 
        onlyRole(COMPLIANCE_ROLE) 
    {
        for (uint256 i = 0; i < users.length; i++) {
            verifiedUsers[users[i]] = status;
            emit UserVerified(users[i], status);
        }
    }
    
    // Set asset compliance status
    function setCompliance(uint256 assetId, bool status) 
        public 
        onlyRole(COMPLIANCE_ROLE) 
    {
        require(_ownerOf(assetId) != address(0), "Asset does not exist");
        assetDetails[assetId].isCompliant = status;
        emit ComplianceUpdated(assetId, status);
    }
    
    // Change asset status (Active, Frozen, Delisted)
    function setAssetStatus(uint256 assetId, AssetStatus newStatus) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        require(_ownerOf(assetId) != address(0), "Asset does not exist");
        assetDetails[assetId].status = newStatus;
        emit AssetStatusChanged(assetId, newStatus);
    }
    
    // Update asset valuation
    function updateValuation(uint256 assetId, uint256 newValuation) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        require(_ownerOf(assetId) != address(0), "Asset does not exist");
        assetDetails[assetId].valuation = newValuation;
        emit ValuationUpdated(assetId, newValuation);
    }
    
    // Transfer with price tracking for secondary market
    function transferWithPrice(
        address from,
        address to,
        uint256 assetId,
        uint256 price
    ) public nonReentrant {
        require(_isAuthorized(_ownerOf(assetId), msg.sender, assetId), "Not authorized");
        require(verifiedUsers[to], "Recipient not verified");
        
        transferHistory[assetId].push(TransferRecord({
            from: from,
            to: to,
            timestamp: block.timestamp,
            price: price
        }));
        
        _transfer(from, to, assetId);
        emit AssetTransferred(from, to, assetId, price);
    }
    
    // Override _update to enforce compliance checks
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Skip checks on minting
        if (from != address(0)) {
            AssetInfo memory info = assetDetails[tokenId];
            require(info.isCompliant, "Asset not compliant");
            require(info.status == AssetStatus.Active, "Asset not active");
            require(verifiedUsers[to], "Recipient not verified");
            
            // Record transfer with zero price (for standard transfers)
            if (transferHistory[tokenId].length == 0 || 
                transferHistory[tokenId][transferHistory[tokenId].length - 1].to != to) {
                transferHistory[tokenId].push(TransferRecord({
                    from: from,
                    to: to,
                    timestamp: block.timestamp,
                    price: 0
                }));
            }
        }
        
        return super._update(to, tokenId, auth);
    }
    
    // Update off-chain metadata
    function updateMetadata(uint256 assetId, string memory newMetadataURI) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        require(_ownerOf(assetId) != address(0), "Asset does not exist");
        assetDetails[assetId].metadataURI = newMetadataURI;
        emit MetadataUpdated(assetId, newMetadataURI);
    }
    
    // Get complete asset information
    function getAssetInfo(uint256 assetId) 
        public 
        view 
        returns (
            string memory metadataURI,
            bool isCompliant,
            AssetStatus status,
            uint256 valuation,
            uint256 registrationDate,
            string memory assetType,
            address owner
        ) 
    {
        require(_ownerOf(assetId) != address(0), "Asset does not exist");
        AssetInfo memory info = assetDetails[assetId];
        return (
            info.metadataURI,
            info.isCompliant,
            info.status,
            info.valuation,
            info.registrationDate,
            info.assetType,
            _ownerOf(assetId)
        );
    }
    
    // Get transfer history for provenance
    function getTransferHistory(uint256 assetId) 
        public 
        view 
        returns (TransferRecord[] memory) 
    {
        require(_ownerOf(assetId) != address(0), "Asset does not exist");
        return transferHistory[assetId];
    }
    
    // Get all assets owned by an address
    function getAssetsByOwner(address owner) 
        public 
        view 
        returns (uint256[] memory) 
    {
        uint256 balance = balanceOf(owner);
        uint256[] memory ownedAssets = new uint256[](balance);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _nextTokenId; i++) {
            if (_ownerOf(i) == owner) {
                ownedAssets[index] = i;
                index++;
                if (index == balance) break;
            }
        }
        
        return ownedAssets;
    }
    
    // Standard tokenURI implementation
    function tokenURI(uint256 assetId) 
        public 
        view 
        virtual 
        override 
        returns (string memory) 
    {
        require(_ownerOf(assetId) != address(0), "Asset does not exist");
        return assetDetails[assetId].metadataURI;
    }
    
    // Required override for multiple inheritance
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}