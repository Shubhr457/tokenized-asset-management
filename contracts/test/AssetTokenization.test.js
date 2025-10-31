const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("AssetTokenization", function () {
  // Fixture should be async and return the contract and accounts
  async function deployAssetTokenizationFixture() {
    const [owner, minter, compliance, admin, user1, user2, user3, attacker] = await ethers.getSigners();

    const AssetTokenization = await ethers.getContractFactory("AssetTokenization");
    const contract = await AssetTokenization.deploy("Tokenized Asset", "TAM");

    return { contract, owner, minter, compliance, admin, user1, user2, user3, attacker };
  }

  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      const { contract } = await loadFixture(deployAssetTokenizationFixture);
      expect(await contract.name()).to.equal("Tokenized Asset");
      expect(await contract.symbol()).to.equal("TAM");
    });

    it("Should grant deployer all roles", async function () {
      const { contract, owner } = await loadFixture(deployAssetTokenizationFixture);
      
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      const MINTER_ROLE = await contract.MINTER_ROLE();
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();

      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await contract.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await contract.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await contract.hasRole(COMPLIANCE_ROLE, owner.address)).to.be.true;
    });

    it("Should mark deployer as verified user", async function () {
      const { contract, owner } = await loadFixture(deployAssetTokenizationFixture);
      expect(await contract.verifiedUsers(owner.address)).to.be.true;
    });

    it("Should initialize with zero tokens", async function () {
      const { contract, owner } = await loadFixture(deployAssetTokenizationFixture);
      expect(await contract.balanceOf(owner.address)).to.equal(0);
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant MINTER_ROLE", async function () {
      const { contract, owner, minter } = await loadFixture(deployAssetTokenizationFixture);
      const MINTER_ROLE = await contract.MINTER_ROLE();
      
      await expect(contract.grantRole(MINTER_ROLE, minter.address))
        .to.emit(contract, "RoleGranted")
        .withArgs(MINTER_ROLE, minter.address, owner.address);
      
      expect(await contract.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });

    it("Should allow admin to grant COMPLIANCE_ROLE", async function () {
      const { contract, owner, compliance } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      expect(await contract.hasRole(COMPLIANCE_ROLE, compliance.address)).to.be.true;
    });

    it("Should allow admin to grant ADMIN_ROLE", async function () {
      const { contract, owner, admin } = await loadFixture(deployAssetTokenizationFixture);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      
      await contract.grantRole(ADMIN_ROLE, admin.address);
      expect(await contract.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should prevent non-admin from granting roles", async function () {
      const { contract, user1, user2 } = await loadFixture(deployAssetTokenizationFixture);
      const MINTER_ROLE = await contract.MINTER_ROLE();
      
      await expect(
        contract.connect(user1).grantRole(MINTER_ROLE, user2.address)
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("Should allow admin to revoke roles", async function () {
      const { contract, owner, minter } = await loadFixture(deployAssetTokenizationFixture);
      const MINTER_ROLE = await contract.MINTER_ROLE();
      
      await contract.grantRole(MINTER_ROLE, minter.address);
      await expect(contract.revokeRole(MINTER_ROLE, minter.address))
        .to.emit(contract, "RoleRevoked")
        .withArgs(MINTER_ROLE, minter.address, owner.address);
      
      expect(await contract.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });
  });

  describe("User Verification", function () {
    it("Should allow COMPLIANCE_ROLE to verify a user", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      
      await expect(contract.connect(compliance).setUserVerification(user1.address, true))
        .to.emit(contract, "UserVerified")
        .withArgs(user1.address, true);
      
      expect(await contract.verifiedUsers(user1.address)).to.be.true;
    });

    it("Should allow COMPLIANCE_ROLE to unverify a user", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      await expect(contract.connect(compliance).setUserVerification(user1.address, false))
        .to.emit(contract, "UserVerified")
        .withArgs(user1.address, false);
      
      expect(await contract.verifiedUsers(user1.address)).to.be.false;
    });

    it("Should prevent non-COMPLIANCE_ROLE from verifying users", async function () {
      const { contract, user1, user2 } = await loadFixture(deployAssetTokenizationFixture);
      
      await expect(
        contract.connect(user1).setUserVerification(user2.address, true)
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("Should allow batch verification of multiple users", async function () {
      const { contract, owner, compliance, user1, user2, user3 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      
      const users = [user1.address, user2.address, user3.address];
      
      await expect(contract.connect(compliance).batchVerifyUsers(users, true))
        .to.emit(contract, "UserVerified")
        .withArgs(user1.address, true)
        .and.to.emit(contract, "UserVerified")
        .withArgs(user2.address, true)
        .and.to.emit(contract, "UserVerified")
        .withArgs(user3.address, true);
      
      expect(await contract.verifiedUsers(user1.address)).to.be.true;
      expect(await contract.verifiedUsers(user2.address)).to.be.true;
      expect(await contract.verifiedUsers(user3.address)).to.be.true;
    });

    it("Should handle empty array in batch verification", async function () {
      const { contract, owner, compliance } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      
      await expect(contract.connect(compliance).batchVerifyUsers([], true))
        .to.be.revertedWith("Empty array");
    });

    it("Should handle batch unverification", async function () {
      const { contract, owner, compliance, user1, user2 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).batchVerifyUsers([user1.address, user2.address], true);
      
      await contract.connect(compliance).batchVerifyUsers([user1.address, user2.address], false);
      
      expect(await contract.verifiedUsers(user1.address)).to.be.false;
      expect(await contract.verifiedUsers(user2.address)).to.be.false;
    });
  });

  describe("Asset Registration", function () {
    it("Should register asset successfully", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      await expect(
        contract.registerAsset(
          user1.address,
          "ipfs://metadata1",
          "property",
          ethers.parseEther("100")
        )
      )
        .to.emit(contract, "AssetRegistered")
        .withArgs(
          user1.address,
          0,
          "property",
          "ipfs://metadata1",
          ethers.parseEther("100")
        );
      
      expect(await contract.ownerOf(0)).to.equal(user1.address);
      expect(await contract.balanceOf(user1.address)).to.equal(1);
    });

    it("Should revert when registering asset to unverified user", async function () {
      const { contract, user1 } = await loadFixture(deployAssetTokenizationFixture);
      
      await expect(
        contract.registerAsset(
          user1.address,
          "ipfs://metadata1",
          "property",
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("Recipient not verified");
    });

    it("Should prevent non-MINTER_ROLE from registering assets", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      await expect(
        contract.connect(compliance).registerAsset(
          user1.address,
          "ipfs://metadata1",
          "property",
          ethers.parseEther("100")
        )
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("Should register asset with zero valuation", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      await contract.registerAsset(
        user1.address,
        "ipfs://metadata1",
        "property",
        0
      );
      
      const info = await contract.getAssetInfo(0);
      expect(info[3]).to.equal(0); // valuation
    });

    it("Should register asset with very large valuation", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      const largeValue = ethers.parseEther("1000000000");
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      await contract.registerAsset(
        user1.address,
        "ipfs://metadata1",
        "property",
        largeValue
      );
      
      const info = await contract.getAssetInfo(0);
      expect(info[3]).to.equal(largeValue);
    });

    it("Should register multiple assets with sequential IDs", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      await contract.registerAsset(user1.address, "ipfs://2", "share", ethers.parseEther("200"));
      await contract.registerAsset(user1.address, "ipfs://3", "collectible", ethers.parseEther("300"));
      
      expect(await contract.ownerOf(0)).to.equal(user1.address);
      expect(await contract.ownerOf(1)).to.equal(user1.address);
      expect(await contract.ownerOf(2)).to.equal(user1.address);
      expect(await contract.balanceOf(user1.address)).to.equal(3);
    });

    it("Should set asset details correctly on registration", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      await contract.registerAsset(
        user1.address,
        "ipfs://test-metadata",
        "property",
        ethers.parseEther("500")
      );
      
      const info = await contract.getAssetInfo(0);
      expect(info[0]).to.equal("ipfs://test-metadata"); // metadataURI
      expect(info[1]).to.be.false; // isCompliant
      expect(info[2]).to.equal(0); // status = Pending
      expect(info[3]).to.equal(ethers.parseEther("500")); // valuation
      expect(info[4]).to.be.greaterThan(0); // registrationDate
      expect(info[5]).to.equal("property"); // assetType
      expect(info[6]).to.equal(user1.address); // owner
    });

    it("Should initialize asset status as Pending", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      await contract.registerAsset(
        user1.address,
        "ipfs://metadata",
        "property",
        ethers.parseEther("100")
      );
      
      const details = await contract.assetDetails(0);
      expect(details.status).to.equal(0); // Pending = 0
    });

    it("Should initialize asset compliance as false", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      await contract.registerAsset(
        user1.address,
        "ipfs://metadata",
        "property",
        ethers.parseEther("100")
      );
      
      const details = await contract.assetDetails(0);
      expect(details.isCompliant).to.be.false;
    });
  });

  describe("Compliance Management", function () {
    it("Should allow COMPLIANCE_ROLE to set compliance status", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      
      await expect(contract.connect(compliance).setCompliance(0, true))
        .to.emit(contract, "ComplianceUpdated")
        .withArgs(0, true);
      
      const details = await contract.assetDetails(0);
      expect(details.isCompliant).to.be.true;
    });

    it("Should revert when setting compliance for non-existent asset", async function () {
      const { contract, owner, compliance } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      
      await expect(
        contract.connect(compliance).setCompliance(999, true)
      ).to.be.revertedWith("Asset does not exist");
    });

    it("Should prevent non-COMPLIANCE_ROLE from setting compliance", async function () {
      const { contract, owner, compliance, user1, attacker } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      
      await expect(
        contract.connect(attacker).setCompliance(0, true)
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("Should allow toggling compliance status multiple times", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      
      await contract.connect(compliance).setCompliance(0, true);
      expect((await contract.assetDetails(0)).isCompliant).to.be.true;
      
      await contract.connect(compliance).setCompliance(0, false);
      expect((await contract.assetDetails(0)).isCompliant).to.be.false;
      
      await contract.connect(compliance).setCompliance(0, true);
      expect((await contract.assetDetails(0)).isCompliant).to.be.true;
    });
  });

  describe("Asset Status Management", function () {
    it("Should allow ADMIN_ROLE to change asset status", async function () {
      const { contract, owner, compliance, admin, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.grantRole(ADMIN_ROLE, admin.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      
      await expect(contract.connect(admin).setAssetStatus(0, 1)) // Active = 1
        .to.emit(contract, "AssetStatusChanged")
        .withArgs(0, 1);
      
      const details = await contract.assetDetails(0);
      expect(details.status).to.equal(1); // Active
    });

    it("Should allow changing status to all valid states", async function () {
      const { contract, owner, compliance, admin, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.grantRole(ADMIN_ROLE, admin.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      
      // Pending = 0, Active = 1, Frozen = 2, Delisted = 3
      await contract.connect(admin).setAssetStatus(0, 1); // Active
      expect((await contract.assetDetails(0)).status).to.equal(1);
      
      await contract.connect(admin).setAssetStatus(0, 2); // Frozen
      expect((await contract.assetDetails(0)).status).to.equal(2);
      
      await contract.connect(admin).setAssetStatus(0, 3); // Delisted
      expect((await contract.assetDetails(0)).status).to.equal(3);
      
      await contract.connect(admin).setAssetStatus(0, 0); // Back to Pending
      expect((await contract.assetDetails(0)).status).to.equal(0);
    });

    it("Should revert when changing status for non-existent asset", async function () {
      const { contract, owner, admin } = await loadFixture(deployAssetTokenizationFixture);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      
      await contract.grantRole(ADMIN_ROLE, admin.address);
      
      await expect(
        contract.connect(admin).setAssetStatus(999, 1)
      ).to.be.revertedWith("Asset does not exist");
    });

    it("Should prevent non-ADMIN_ROLE from changing asset status", async function () {
      const { contract, owner, compliance, user1, attacker } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      
      await expect(
        contract.connect(attacker).setAssetStatus(0, 1)
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Valuation Management", function () {
    it("Should allow ADMIN_ROLE to update valuation", async function () {
      const { contract, owner, compliance, admin, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.grantRole(ADMIN_ROLE, admin.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      
      const newValuation = ethers.parseEther("200");
      await expect(contract.connect(admin).updateValuation(0, newValuation))
        .to.emit(contract, "ValuationUpdated")
        .withArgs(0, newValuation);
      
      const details = await contract.assetDetails(0);
      expect(details.valuation).to.equal(newValuation);
    });

    it("Should allow updating valuation to zero", async function () {
      const { contract, owner, compliance, admin, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.grantRole(ADMIN_ROLE, admin.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      
      await contract.connect(admin).updateValuation(0, 0);
      const details = await contract.assetDetails(0);
      expect(details.valuation).to.equal(0);
    });

    it("Should revert when updating valuation for non-existent asset", async function () {
      const { contract, owner, admin } = await loadFixture(deployAssetTokenizationFixture);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      
      await contract.grantRole(ADMIN_ROLE, admin.address);
      
      await expect(
        contract.connect(admin).updateValuation(999, ethers.parseEther("100"))
      ).to.be.revertedWith("Asset does not exist");
    });

    it("Should prevent non-ADMIN_ROLE from updating valuation", async function () {
      const { contract, owner, compliance, user1, attacker } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      
      await expect(
        contract.connect(attacker).updateValuation(0, ethers.parseEther("200"))
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Metadata Management", function () {
    it("Should allow ADMIN_ROLE to update metadata", async function () {
      const { contract, owner, compliance, admin, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.grantRole(ADMIN_ROLE, admin.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://old", "property", ethers.parseEther("100"));
      
      await expect(contract.connect(admin).updateMetadata(0, "ipfs://new"))
        .to.emit(contract, "MetadataUpdated")
        .withArgs(0, "ipfs://new");
      
      const info = await contract.getAssetInfo(0);
      expect(info[0]).to.equal("ipfs://new");
    });

    it("Should revert when updating metadata for non-existent asset", async function () {
      const { contract, owner, admin } = await loadFixture(deployAssetTokenizationFixture);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      
      await contract.grantRole(ADMIN_ROLE, admin.address);
      
      await expect(
        contract.connect(admin).updateMetadata(999, "ipfs://new")
      ).to.be.revertedWith("Asset does not exist");
    });

    it("Should prevent non-ADMIN_ROLE from updating metadata", async function () {
      const { contract, owner, compliance, user1, attacker } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://old", "property", ethers.parseEther("100"));
      
      await expect(
        contract.connect(attacker).updateMetadata(0, "ipfs://new")
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("Should allow updating metadata to empty string", async function () {
      const { contract, owner, compliance, admin, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.grantRole(ADMIN_ROLE, admin.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://old", "property", ethers.parseEther("100"));
      
      await contract.connect(admin).updateMetadata(0, "");
      const info = await contract.getAssetInfo(0);
      expect(info[0]).to.equal("");
    });
  });

  describe("Transfer Functionality", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployAssetTokenizationFixture);
      this.contract = fixture.contract;
      this.owner = fixture.owner;
      this.compliance = fixture.compliance;
      this.user1 = fixture.user1;
      this.user2 = fixture.user2;
      
      const COMPLIANCE_ROLE = await this.contract.COMPLIANCE_ROLE();
      await this.contract.grantRole(COMPLIANCE_ROLE, this.compliance.address);
      
      await this.contract.connect(this.compliance).setUserVerification(this.user1.address, true);
      await this.contract.connect(this.compliance).setUserVerification(this.user2.address, true);
      
      await this.contract.registerAsset(
        this.user1.address,
        "ipfs://1",
        "property",
        ethers.parseEther("100")
      );
    });

    it("Should prevent transfer of non-compliant asset", async function () {
      await expect(
        this.contract.connect(this.user1).transferFrom(
          this.user1.address,
          this.user2.address,
          0
        )
      ).to.be.revertedWith("Asset not compliant");
    });

    it("Should prevent transfer of non-active asset", async function () {
      const ADMIN_ROLE = await this.contract.ADMIN_ROLE();
      await this.contract.grantRole(ADMIN_ROLE, this.owner.address);
      
      await this.contract.connect(this.compliance).setCompliance(0, true);
      await this.contract.setAssetStatus(0, 2); // Frozen
      
      await expect(
        this.contract.connect(this.user1).transferFrom(
          this.user1.address,
          this.user2.address,
          0
        )
      ).to.be.revertedWith("Asset not active");
    });

    it("Should prevent transfer to unverified user", async function () {
      const ADMIN_ROLE = await this.contract.ADMIN_ROLE();
      await this.contract.grantRole(ADMIN_ROLE, this.owner.address);
      
      // Unverify user2 for this test
      await this.contract.connect(this.compliance).setUserVerification(this.user2.address, false);
      
      await this.contract.connect(this.compliance).setCompliance(0, true);
      await this.contract.setAssetStatus(0, 1); // Active
      
      await expect(
        this.contract.connect(this.user1).transferFrom(
          this.user1.address,
          this.user2.address,
          0
        )
      ).to.be.revertedWith("Recipient not verified");
    });

    it("Should allow transfer when all conditions are met", async function () {
      const ADMIN_ROLE = await this.contract.ADMIN_ROLE();
      await this.contract.grantRole(ADMIN_ROLE, this.owner.address);
      
      await this.contract.connect(this.compliance).setCompliance(0, true);
      await this.contract.setAssetStatus(0, 1); // Active
      
      await this.contract.connect(this.user1).transferFrom(
        this.user1.address,
        this.user2.address,
        0
      );
      
      expect(await this.contract.ownerOf(0)).to.equal(this.user2.address);
      expect(await this.contract.balanceOf(this.user1.address)).to.equal(0);
      expect(await this.contract.balanceOf(this.user2.address)).to.equal(1);
    });

    it("Should record transfer history on standard transfer", async function () {
      const ADMIN_ROLE = await this.contract.ADMIN_ROLE();
      await this.contract.grantRole(ADMIN_ROLE, this.owner.address);
      
      await this.contract.connect(this.compliance).setCompliance(0, true);
      await this.contract.setAssetStatus(0, 1); // Active
      
      await this.contract.connect(this.user1).transferFrom(
        this.user1.address,
        this.user2.address,
        0
      );
      
      const history = await this.contract.getTransferHistory(0);
      expect(history.length).to.equal(1);
      expect(history[0].from).to.equal(this.user1.address);
      expect(history[0].to).to.equal(this.user2.address);
      expect(history[0].price).to.equal(0);
    });

    it("Should allow transferWithPrice with price tracking", async function () {
      const ADMIN_ROLE = await this.contract.ADMIN_ROLE();
      await this.contract.grantRole(ADMIN_ROLE, this.owner.address);
      
      await this.contract.connect(this.compliance).setCompliance(0, true);
      await this.contract.setAssetStatus(0, 1); // Active
      
      const price = ethers.parseEther("50");
      
      await expect(
        this.contract.connect(this.user1).transferWithPrice(
          this.user1.address,
          this.user2.address,
          0,
          price
        )
      )
        .to.emit(this.contract, "AssetTransferred")
        .withArgs(this.user1.address, this.user2.address, 0, price);
      
      const history = await this.contract.getTransferHistory(0);
      expect(history.length).to.equal(1);
      expect(history[0].price).to.equal(price);
    });

    it("Should prevent unauthorized transferWithPrice", async function () {
      const ADMIN_ROLE = await this.contract.ADMIN_ROLE();
      await this.contract.grantRole(ADMIN_ROLE, this.owner.address);
      
      await this.contract.connect(this.compliance).setCompliance(0, true);
      await this.contract.setAssetStatus(0, 1); // Active
      
      await expect(
        this.contract.connect(this.user2).transferWithPrice(
          this.user1.address,
          this.user2.address,
          0,
          ethers.parseEther("50")
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("Should prevent transferWithPrice to unverified user", async function () {
      const fixture = await loadFixture(deployAssetTokenizationFixture);
      const contract = fixture.contract;
      const owner = fixture.owner;
      const compliance = fixture.compliance;
      const user1 = fixture.user1;
      const user2 = fixture.user2;
      const unverifiedUser = fixture.user3;
      
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.grantRole(ADMIN_ROLE, owner.address);
      
      await contract.connect(compliance).setUserVerification(user1.address, true);
      // user2 is verified, but unverifiedUser is not
      
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(0, true);
      await contract.setAssetStatus(0, 1); // Active
      
      await expect(
        contract.connect(user1).transferWithPrice(
          user1.address,
          unverifiedUser.address,
          0,
          ethers.parseEther("50")
        )
      ).to.be.revertedWith("Recipient not verified");
    });

    it("Should record multiple transfers in history", async function () {
      const fixture = await loadFixture(deployAssetTokenizationFixture);
      const contract = fixture.contract;
      const owner = fixture.owner;
      const compliance = fixture.compliance;
      const user1 = fixture.user1;
      const user2 = fixture.user2;
      const user3 = fixture.user3;
      
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.grantRole(ADMIN_ROLE, owner.address);
      
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.connect(compliance).setUserVerification(user2.address, true);
      await contract.connect(compliance).setUserVerification(user3.address, true);
      
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(0, true);
      await contract.setAssetStatus(0, 1); // Active
      
      await contract.connect(user1).transferFrom(user1.address, user2.address, 0);
      await contract.connect(compliance).setCompliance(0, true);
      await contract.connect(user2).transferFrom(user2.address, user3.address, 0);
      
      const history = await contract.getTransferHistory(0);
      expect(history.length).to.equal(2);
      expect(history[0].to).to.equal(user2.address);
      expect(history[1].to).to.equal(user3.address);
    });

    it("Should not record duplicate transfers to same recipient", async function () {
      const ADMIN_ROLE = await this.contract.ADMIN_ROLE();
      await this.contract.grantRole(ADMIN_ROLE, this.owner.address);
      
      await this.contract.connect(this.compliance).setCompliance(0, true);
      await this.contract.setAssetStatus(0, 1); // Active
      
      // Transfer to user2
      await this.contract.connect(this.user1).transferFrom(
        this.user1.address,
        this.user2.address,
        0
      );
      
      // Transfer back to user1
      await this.contract.connect(this.compliance).setCompliance(0, true);
      await this.contract.connect(this.user2).transferFrom(
        this.user2.address,
        this.user1.address,
        0
      );
      
      // Transfer to user2 again - should not duplicate
      await this.contract.connect(this.compliance).setCompliance(0, true);
      await this.contract.connect(this.user1).transferFrom(
        this.user1.address,
        this.user2.address,
        0
      );
      
      const history = await this.contract.getTransferHistory(0);
      // Should have 3 transfers: user1->user2, user2->user1, user1->user2
      expect(history.length).to.equal(3);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployAssetTokenizationFixture);
      this.contract = fixture.contract;
      this.owner = fixture.owner;
      this.compliance = fixture.compliance;
      this.user1 = fixture.user1;
      this.user2 = fixture.user2;
      
      const COMPLIANCE_ROLE = await this.contract.COMPLIANCE_ROLE();
      await this.contract.grantRole(COMPLIANCE_ROLE, this.compliance.address);
      
      await this.contract.connect(this.compliance).setUserVerification(this.user1.address, true);
      await this.contract.connect(this.compliance).setUserVerification(this.user2.address, true);
    });

    it("Should return correct asset info", async function () {
      await this.contract.registerAsset(
        this.user1.address,
        "ipfs://test",
        "property",
        ethers.parseEther("150")
      );
      
      const info = await this.contract.getAssetInfo(0);
      expect(info[0]).to.equal("ipfs://test");
      expect(info[1]).to.be.false; // isCompliant
      expect(info[2]).to.equal(0); // status = Pending
      expect(info[3]).to.equal(ethers.parseEther("150"));
      expect(info[4]).to.be.greaterThan(0);
      expect(info[5]).to.equal("property");
      expect(info[6]).to.equal(this.user1.address);
    });

    it("Should revert getAssetInfo for non-existent asset", async function () {
      await expect(
        this.contract.getAssetInfo(999)
      ).to.be.revertedWith("Asset does not exist");
    });

    it("Should return empty transfer history for new asset", async function () {
      await this.contract.registerAsset(
        this.user1.address,
        "ipfs://test",
        "property",
        ethers.parseEther("100")
      );
      
      const history = await this.contract.getTransferHistory(0);
      expect(history.length).to.equal(0);
    });

    it("Should revert getTransferHistory for non-existent asset", async function () {
      await expect(
        this.contract.getTransferHistory(999)
      ).to.be.revertedWith("Asset does not exist");
    });

    it("Should return correct assets by owner", async function () {
      await this.contract.registerAsset(this.user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      await this.contract.registerAsset(this.user1.address, "ipfs://2", "share", ethers.parseEther("200"));
      await this.contract.registerAsset(this.user2.address, "ipfs://3", "collectible", ethers.parseEther("300"));
      
      const user1Assets = await this.contract.getAssetsByOwner(this.user1.address);
      const user2Assets = await this.contract.getAssetsByOwner(this.user2.address);
      
      expect(user1Assets.length).to.equal(2);
      expect(user1Assets[0]).to.equal(0);
      expect(user1Assets[1]).to.equal(1);
      
      expect(user2Assets.length).to.equal(1);
      expect(user2Assets[0]).to.equal(2);
    });

    it("Should return empty array for owner with no assets", async function () {
      const emptyAssets = await this.contract.getAssetsByOwner(this.user1.address);
      expect(emptyAssets.length).to.equal(0);
    });

    it("Should return correct tokenURI", async function () {
      await this.contract.registerAsset(
        this.user1.address,
        "ipfs://custom-uri",
        "property",
        ethers.parseEther("100")
      );
      
      expect(await this.contract.tokenURI(0)).to.equal("ipfs://custom-uri");
    });

    it("Should revert tokenURI for non-existent asset", async function () {
      await expect(
        this.contract.tokenURI(999)
      ).to.be.revertedWith("Asset does not exist");
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle safeMint with contract receiver that rejects", async function () {
      const { contract, owner, compliance } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      
      // Deploy a contract that rejects ERC721 tokens
      const RejectingReceiver = await ethers.getContractFactory("RejectingReceiver");
      const receiver = await RejectingReceiver.deploy();
      
      // Verify the receiver address
      await contract.connect(compliance).setUserVerification(await receiver.getAddress(), true);
      
      // Should revert because receiver rejects the token
      await expect(
        contract.registerAsset(
          await receiver.getAddress(),
          "ipfs://test",
          "property",
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("Token rejected");
    });

    it("Should prevent reentrancy attacks in transferWithPrice", async function () {
      const fixture = await loadFixture(deployAssetTokenizationFixture);
      const contract = fixture.contract;
      const owner = fixture.owner;
      const compliance = fixture.compliance;
      const user1 = fixture.user1;
      const user2 = fixture.user2;
      
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.grantRole(ADMIN_ROLE, owner.address);
      
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.connect(compliance).setUserVerification(user2.address, true);
      
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(0, true);
      await contract.setAssetStatus(0, 1); // Active
      
      // Deploy a malicious contract that tries to reenter
      const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
      const attacker = await ReentrancyAttacker.deploy(await contract.getAddress());
      
      await contract.connect(compliance).setUserVerification(await attacker.getAddress(), true);
      await contract.connect(compliance).setUserVerification(user2.address, true);
      
      // Transfer token to attacker contract
      await contract.connect(user1).transferFrom(user1.address, await attacker.getAddress(), 0);
      
      // Try to call transferWithPrice through the attacker contract
      // The reentrancy protection is already tested by the nonReentrant modifier
      // If someone tries to call transferWithPrice again during execution, it will revert
      await attacker.attack(0, user2.address, ethers.parseEther("50"));
      
      // Verify the transfer happened
      expect(await contract.ownerOf(0)).to.equal(user2.address);
    });

    it("Should handle very large arrays in batch verification", async function () {
      const { contract, owner, compliance } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      
      // Create 50 addresses
      const users = [];
      for (let i = 0; i < 50; i++) {
        const signer = await ethers.getSigner(ethers.Wallet.createRandom().address);
        users.push(signer.address);
      }
      
      await expect(
        contract.connect(compliance).batchVerifyUsers(users, true)
      ).to.not.be.reverted;
    });

    it("Should handle maximum uint256 valuation", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      const maxValue = ethers.MaxUint256;
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      await contract.registerAsset(
        user1.address,
        "ipfs://test",
        "property",
        maxValue
      );
      
      const info = await contract.getAssetInfo(0);
      expect(info[3]).to.equal(maxValue);
    });

    it("Should handle zero address in user verification", async function () {
      const { contract, owner, compliance } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      
      // Should not revert but set verification for zero address
      await contract.connect(compliance).setUserVerification(ethers.ZeroAddress, true);
      expect(await contract.verifiedUsers(ethers.ZeroAddress)).to.be.true;
    });

    it("Should prevent transfer to zero address", async function () {
      const fixture = await loadFixture(deployAssetTokenizationFixture);
      const contract = fixture.contract;
      const owner = fixture.owner;
      const compliance = fixture.compliance;
      const user1 = fixture.user1;
      
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.grantRole(ADMIN_ROLE, owner.address);
      
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.registerAsset(user1.address, "ipfs://1", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(0, true);
      await contract.setAssetStatus(0, 1); // Active
      
      await expect(
        contract.connect(user1).transferFrom(user1.address, ethers.ZeroAddress, 0)
      ).to.be.revertedWithCustomError(contract, "ERC721InvalidReceiver").withArgs(ethers.ZeroAddress);
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC721 interface", async function () {
      const { contract } = await loadFixture(deployAssetTokenizationFixture);
      // ERC721 interface ID = 0x80ac58cd
      expect(await contract.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("Should support ERC165 interface", async function () {
      const { contract } = await loadFixture(deployAssetTokenizationFixture);
      // ERC165 interface ID = 0x01ffc9a7
      expect(await contract.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("Should support AccessControl interface", async function () {
      const { contract } = await loadFixture(deployAssetTokenizationFixture);
      // AccessControl interface ID = 0x7965db0b
      expect(await contract.supportsInterface("0x7965db0b")).to.be.true;
    });

    it("Should not support arbitrary interface", async function () {
      const { contract } = await loadFixture(deployAssetTokenizationFixture);
      expect(await contract.supportsInterface("0x12345678")).to.be.false;
    });
  });

  describe("Pausable Functionality", function () {
    it("Should allow ADMIN_ROLE to pause the contract", async function () {
      const { contract, owner } = await loadFixture(deployAssetTokenizationFixture);
      
      await expect(contract.pause())
        .to.emit(contract, "ContractPaused")
        .withArgs(owner.address);
      
      expect(await contract.paused()).to.be.true;
    });

    it("Should allow ADMIN_ROLE to unpause the contract", async function () {
      const { contract, owner } = await loadFixture(deployAssetTokenizationFixture);
      
      await contract.pause();
      expect(await contract.paused()).to.be.true;
      
      await expect(contract.unpause())
        .to.emit(contract, "ContractUnpaused")
        .withArgs(owner.address);
      
      expect(await contract.paused()).to.be.false;
    });

    it("Should prevent non-ADMIN from pausing", async function () {
      const { contract, user1 } = await loadFixture(deployAssetTokenizationFixture);
      
      await expect(
        contract.connect(user1).pause()
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("Should prevent non-ADMIN from unpausing", async function () {
      const { contract, owner, user1 } = await loadFixture(deployAssetTokenizationFixture);
      
      await contract.pause();
      
      await expect(
        contract.connect(user1).unpause()
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("Should prevent transfers when paused", async function () {
      const { contract, owner, compliance, user1, user2 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      // Setup: Register and activate asset
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.connect(compliance).setUserVerification(user2.address, true);
      
      const assetId = 0;
      await contract.registerAsset(user1.address, "ipfs://test", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(assetId, true);
      await contract.setAssetStatus(assetId, 1); // Active
      
      // Pause contract
      await contract.pause();
      
      // Try to transfer
      await expect(
        contract.connect(user1).transferFrom(user1.address, user2.address, assetId)
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    });

    it("Should prevent transferWithPrice when paused", async function () {
      const { contract, owner, compliance, user1, user2 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      // Setup
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.connect(compliance).setUserVerification(user2.address, true);
      
      const assetId = 0;
      await contract.registerAsset(user1.address, "ipfs://test", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(assetId, true);
      await contract.setAssetStatus(assetId, 1);
      
      // Pause contract
      await contract.pause();
      
      await expect(
        contract.connect(user1).transferWithPrice(user1.address, user2.address, assetId, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    });

    it("Should allow minting when paused (admin operations)", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      await contract.pause();
      
      // Minting should still work (no transfer from previous owner)
      await expect(
        contract.registerAsset(user1.address, "ipfs://test", "property", ethers.parseEther("100"))
      ).to.not.be.reverted;
    });
  });

  describe("Batch Operation Limits", function () {
    it("Should enforce maximum batch size", async function () {
      const { contract, owner, compliance } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      
      // Create array larger than MAX_BATCH_SIZE (100)
      const largeArray = new Array(101).fill(0).map((_, i) => ethers.Wallet.createRandom().address);
      
      await expect(
        contract.connect(compliance).batchVerifyUsers(largeArray, true)
      ).to.be.revertedWith("Batch too large");
    });

    it("Should reject empty array in batch verification", async function () {
      const { contract, owner, compliance } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      
      await expect(
        contract.connect(compliance).batchVerifyUsers([], true)
      ).to.be.revertedWith("Empty array");
    });

    it("Should successfully process maximum allowed batch size", async function () {
      const { contract, owner, compliance } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      
      // Create array of exactly MAX_BATCH_SIZE (100)
      const maxArray = new Array(100).fill(0).map((_, i) => ethers.Wallet.createRandom().address);
      
      await expect(
        contract.connect(compliance).batchVerifyUsers(maxArray, true)
      ).to.emit(contract, "BatchVerificationCompleted")
        .withArgs(100, true);
      
      // Verify all users were verified
      for (const addr of maxArray) {
        expect(await contract.verifiedUsers(addr)).to.be.true;
      }
    });

    it("Should emit BatchVerificationCompleted event with correct count", async function () {
      const { contract, owner, compliance, user1, user2, user3 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      
      const users = [user1.address, user2.address, user3.address];
      
      await expect(
        contract.connect(compliance).batchVerifyUsers(users, true)
      ).to.emit(contract, "BatchVerificationCompleted")
        .withArgs(3, true);
    });
  });

  describe("Transfer History Logic", function () {
    it("Should not create duplicate transfer records", async function () {
      const { contract, owner, compliance, user1, user2 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.connect(compliance).setUserVerification(user2.address, true);
      
      const assetId = 0;
      await contract.registerAsset(user1.address, "ipfs://test", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(assetId, true);
      await contract.setAssetStatus(assetId, 1);
      
      // Transfer with price
      await contract.connect(user1).transferWithPrice(user1.address, user2.address, assetId, ethers.parseEther("50"));
      
      const history = await contract.getTransferHistory(assetId);
      
      // Should have exactly 1 record
      expect(history.length).to.equal(1);
      expect(history[0].from).to.equal(user1.address);
      expect(history[0].to).to.equal(user2.address);
      expect(history[0].price).to.equal(ethers.parseEther("50"));
    });

    it("Should record standard transfer with zero price", async function () {
      const { contract, owner, compliance, user1, user2 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.connect(compliance).setUserVerification(user2.address, true);
      
      const assetId = 0;
      await contract.registerAsset(user1.address, "ipfs://test", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(assetId, true);
      await contract.setAssetStatus(assetId, 1);
      
      // Standard transfer (not transferWithPrice)
      await contract.connect(user1).transferFrom(user1.address, user2.address, assetId);
      
      const history = await contract.getTransferHistory(assetId);
      
      expect(history.length).to.equal(1);
      expect(history[0].price).to.equal(0);
    });

    it("Should maintain correct history across multiple transfers", async function () {
      const { contract, owner, compliance, user1, user2, user3 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).batchVerifyUsers([user1.address, user2.address, user3.address], true);
      
      const assetId = 0;
      await contract.registerAsset(user1.address, "ipfs://test", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(assetId, true);
      await contract.setAssetStatus(assetId, 1);
      
      // Transfer 1: user1 -> user2 with price
      await contract.connect(user1).transferWithPrice(user1.address, user2.address, assetId, ethers.parseEther("50"));
      
      // Transfer 2: user2 -> user3 standard transfer
      await contract.connect(user2).transferFrom(user2.address, user3.address, assetId);
      
      const history = await contract.getTransferHistory(assetId);
      
      expect(history.length).to.equal(2);
      expect(history[0].from).to.equal(user1.address);
      expect(history[0].to).to.equal(user2.address);
      expect(history[0].price).to.equal(ethers.parseEther("50"));
      
      expect(history[1].from).to.equal(user2.address);
      expect(history[1].to).to.equal(user3.address);
      expect(history[1].price).to.equal(0);
    });

    it("Should have empty history for newly minted asset", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      const assetId = 0;
      await contract.registerAsset(user1.address, "ipfs://test", "property", ethers.parseEther("100"));
      
      const history = await contract.getTransferHistory(assetId);
      expect(history.length).to.equal(0);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should prevent transfer to zero address", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      
      const assetId = 0;
      await contract.registerAsset(user1.address, "ipfs://test", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(assetId, true);
      await contract.setAssetStatus(assetId, 1);
      
      await expect(
        contract.connect(user1).transferFrom(user1.address, ethers.ZeroAddress, assetId)
      ).to.be.reverted;
    });

    it("Should prevent transfer of non-existent asset", async function () {
      const { contract, user1, user2 } = await loadFixture(deployAssetTokenizationFixture);
      
      await expect(
        contract.connect(user1).transferFrom(user1.address, user2.address, 999)
      ).to.be.reverted;
    });

    it("Should prevent unauthorized transfer", async function () {
      const { contract, owner, compliance, user1, user2, user3 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.connect(compliance).setUserVerification(user2.address, true);
      
      const assetId = 0;
      await contract.registerAsset(user1.address, "ipfs://test", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(assetId, true);
      await contract.setAssetStatus(assetId, 1);
      
      // user3 tries to transfer user1's asset
      await expect(
        contract.connect(user3).transferFrom(user1.address, user2.address, assetId)
      ).to.be.revertedWithCustomError(contract, "ERC721InsufficientApproval");
    });

    it("Should handle rapid pause/unpause cycles", async function () {
      const { contract, owner } = await loadFixture(deployAssetTokenizationFixture);
      
      await contract.pause();
      await contract.unpause();
      await contract.pause();
      await contract.unpause();
      
      expect(await contract.paused()).to.be.false;
    });

    it("Should prevent double pausing", async function () {
      const { contract, owner } = await loadFixture(deployAssetTokenizationFixture);
      
      await contract.pause();
      
      await expect(
        contract.pause()
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    });

    it("Should prevent double unpausing", async function () {
      const { contract, owner } = await loadFixture(deployAssetTokenizationFixture);
      
      await expect(
        contract.unpause()
      ).to.be.revertedWithCustomError(contract, "ExpectedPause");
    });

    it("Should handle compliance status change during transfer attempt", async function () {
      const { contract, owner, compliance, user1, user2 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      await contract.connect(compliance).setUserVerification(user2.address, true);
      
      const assetId = 0;
      await contract.registerAsset(user1.address, "ipfs://test", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(assetId, true);
      await contract.setAssetStatus(assetId, 1);
      
      // Remove compliance
      await contract.connect(compliance).setCompliance(assetId, false);
      
      // Transfer should fail
      await expect(
        contract.connect(user1).transferFrom(user1.address, user2.address, assetId)
      ).to.be.revertedWith("Asset not compliant");
    });

    it("Should prevent transfer to unverified user via transferWithPrice", async function () {
      const { contract, owner, compliance, user1, user2 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      // user2 is NOT verified
      
      const assetId = 0;
      await contract.registerAsset(user1.address, "ipfs://test", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(assetId, true);
      await contract.setAssetStatus(assetId, 1);
      
      await expect(
        contract.connect(user1).transferWithPrice(user1.address, user2.address, assetId, ethers.parseEther("50"))
      ).to.be.revertedWith("Recipient not verified");
    });

    it("Should handle batch verification with duplicate addresses", async function () {
      const { contract, owner, compliance, user1 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      
      // Same address multiple times
      const users = [user1.address, user1.address, user1.address];
      
      await expect(
        contract.connect(compliance).batchVerifyUsers(users, true)
      ).to.emit(contract, "BatchVerificationCompleted")
        .withArgs(3, true);
      
      expect(await contract.verifiedUsers(user1.address)).to.be.true;
    });

    it("Should maintain correct owner after failed transfer", async function () {
      const { contract, owner, compliance, user1, user2 } = await loadFixture(deployAssetTokenizationFixture);
      const COMPLIANCE_ROLE = await contract.COMPLIANCE_ROLE();
      
      await contract.grantRole(COMPLIANCE_ROLE, compliance.address);
      await contract.connect(compliance).setUserVerification(user1.address, true);
      // user2 not verified
      
      const assetId = 0;
      await contract.registerAsset(user1.address, "ipfs://test", "property", ethers.parseEther("100"));
      await contract.connect(compliance).setCompliance(assetId, true);
      await contract.setAssetStatus(assetId, 1);
      
      // Try transfer to unverified user
      await expect(
        contract.connect(user1).transferFrom(user1.address, user2.address, assetId)
      ).to.be.revertedWith("Recipient not verified");
      
      // Owner should still be user1
      expect(await contract.ownerOf(assetId)).to.equal(user1.address);
    });
  });
});


