// Contract ABIs will be imported here
// The ABI will be loaded from the compiled contract artifacts

export const loadContractABI = (): any => {
  try {
    const path = require('path');
    const fs = require('fs');
    const abiPath = path.join(__dirname, '../../../contracts/artifacts/contracts/token-managemnt.sol/AssetTokenization.json');
    const contractData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    return contractData;
  } catch (error) {
    console.warn('Could not load contract ABI from file.');
    return { abi: [] };
  }
};

