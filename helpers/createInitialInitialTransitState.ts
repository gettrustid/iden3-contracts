import { DeployHelper } from "./DeployHelper";
import { ethers } from "hardhat";
import * as stateArtifact from "../artifacts/contracts/state/State.sol/State.json";
import { Contract, Signer } from "ethers";

// Update this address to the State contract address from your deployment
const stateContractAddress = "0xEE812701740fD337bB17ca7b59d39cBDB2dE0800";

// Define the default ID type (replace with the appropriate type for your use case)
const DEFAULT_ID_TYPE = "0x0150";

async function getInitContract(
  contractMeta: {
    contractNameOrAbi?: string | any[];
    address?: string;
  },
  signer: Signer,
): Promise<Contract> {
  if (Object.keys(contractMeta).every((key) => !contractMeta[key])) {
    throw new Error("contract meta is empty");
  }

  if (contractMeta.address && contractMeta.contractNameOrAbi) {
    return ethers.getContractAt(contractMeta.contractNameOrAbi, contractMeta.address, signer);
  }

  throw new Error("Invalid contract meta");
}

async function main() {
  const [signer] = await ethers.getSigners();

  // Initialize State contract
  const stateContract = await getInitContract(
    {
      contractNameOrAbi: stateArtifact.abi,
      address: stateContractAddress,
    },
    signer,
  );

  // Check and set default ID type
  const currentDefaultIdType = await stateContract.getDefaultIdType();
  console.log("Current default ID type:", currentDefaultIdType);

  // If current default ID type is empty or zero, set the new default ID type
  if (currentDefaultIdType === "0x" || currentDefaultIdType === "0x0000") {
    console.log(`Setting default ID type to ${DEFAULT_ID_TYPE}`);
    const setDefaultIdTypeTx = await stateContract.setDefaultIdType(DEFAULT_ID_TYPE);
    await setDefaultIdTypeTx.wait();
    console.log("Default ID type set successfully");
  }

  // Check if the ID type is supported, if not, add support
  const isDefaultIdTypeSupported = await stateContract.isIdTypeSupported(DEFAULT_ID_TYPE);
  if (!isDefaultIdTypeSupported) {
    console.log(`Adding support for ID type ${DEFAULT_ID_TYPE}`);
    const setSupportedIdTypeTx = await stateContract.setSupportedIdType(DEFAULT_ID_TYPE, true);
    await setSupportedIdTypeTx.wait();
    console.log("ID type support added successfully");
  }

  // Verify the default ID type and its support
  const verifiedDefaultIdType = await stateContract.getDefaultIdType();
  const verifiedIdTypeSupport = await stateContract.isIdTypeSupported(DEFAULT_ID_TYPE);
  console.log("Verified default ID type:", verifiedDefaultIdType);
  console.log("Is default ID type supported:", verifiedIdTypeSupport);

  // Get GIST root before state transition
  const gistRootBefore = await stateContract.getGISTRoot();
  console.log("GIST root before:", gistRootBefore);

  // Initialize DeployHelper
  const deployHelper = await DeployHelper.initialize();
  const guWrpr = await deployHelper.deployGenesisUtilsWrapper();
  await guWrpr.waitForDeployment();

  // Calculate onchain ID
  const onchainId = await guWrpr.calcOnchainIdFromAddress(DEFAULT_ID_TYPE, signer.address);
  console.log("Calculated onchain ID:", onchainId);

  // Perform state transition
  const tx = await stateContract.transitStateGeneric(onchainId, 0, 2199023255552, true, 1, "0x");
  await tx.wait();

  // Get GIST root after state transition
  const gistRootAfter = await stateContract.getGISTRoot();
  console.log("GIST root after:", gistRootAfter);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
