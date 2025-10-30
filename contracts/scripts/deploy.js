const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts to Polygon Amoy...\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "MATIC\n");

  // Deploy AssetTokenization(name, symbol)
  const ContractFactory = await hre.ethers.getContractFactory("AssetTokenization");
  console.log("Deploying AssetTokenization contract...");
  const contract = await ContractFactory.deploy("Tokenized Asset", "TAM");
  await contract.waitForDeployment();
  const deployedAddress = typeof contract.getAddress === "function"
    ? await contract.getAddress()
    : contract.target; // ethers v6
  console.log("Contract deployed to:", deployedAddress);

  console.log("\n✅ Deployment complete!");
  console.log("\nTo verify your contract, run:");
  console.log(`npx hardhat verify --network amoy ${deployedAddress} "Tokenized Asset" "TAM"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

