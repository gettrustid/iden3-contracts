import { DeployHelper } from "./DeployHelper";
import { ethers } from "hardhat";
import { Interface } from "ethers";

// This script is a more robust version of createInitialInitialTransitState.

async function main() {
  try {
    const [signer] = await ethers.getSigners();
    console.log("Using signer address:", signer.address);

    // Addresses
    const STATE_CONTRACT_ADDRESS = "0xEE812701740fD337bB17ca7b59d39cBDB2dE0800";
    const VERIFIER_ADDRESS = "0x953C49c950119229C7f9B44610Ba40709F76C060";
    const DEFAULT_ID_TYPE = "0x0150";

    // Get State contract interface
    const stateContract = await ethers.getContractAt("State", STATE_CONTRACT_ADDRESS, signer);

    // 1. Try to initialize
    try {
      console.log("\nStep 1: Initializing state contract...");
      const tx1 = await stateContract.initialize(
        VERIFIER_ADDRESS,
        DEFAULT_ID_TYPE,
        signer.address,
        ethers.ZeroAddress,
        { gasLimit: 3000000 },
      );
      const receipt1 = await tx1.wait();
      if (receipt1) {
        console.log("Initialize transaction:", receipt1.hash);
      } else {
        console.log("Initialize transaction: receipt is null");
      }
    } catch (error: any) {
      console.log("Initialization error (may be already initialized):", error.message);
    }

    // 2. Try to set ID type support
    try {
      console.log("\nStep 2: Setting ID type support...");
      const tx2 = await stateContract.setSupportedIdType(DEFAULT_ID_TYPE, true, {
        gasLimit: 3000000,
      });
      const receipt2 = await tx2.wait();
      if (receipt2) {
        console.log("Set supported ID type transaction:", receipt2.hash);
      } else {
        console.log("Set supported ID type transaction: receipt is null");
      }
    } catch (error: any) {
      console.log("Set ID type support error:", error.message);
    }

    // 3. Try to set default ID type
    try {
      console.log("\nStep 3: Setting default ID type...");
      const tx3 = await stateContract.setDefaultIdType(DEFAULT_ID_TYPE, { gasLimit: 3000000 });
      const receipt3 = await tx3.wait();
      if (receipt3) {
        console.log("Set default ID type transaction:", receipt3.hash);
      } else {
        console.log("Set default ID type transaction: receipt is null");
      }
    } catch (error: any) {
      console.log("Set default ID type error:", error.message);
    }

    // 4. Deploy GenesisUtilsWrapper
    console.log("\nStep 4: Deploying GenesisUtilsWrapper...");
    const deployHelper = await DeployHelper.initialize();
    const guWrpr = await deployHelper.deployGenesisUtilsWrapper();
    await guWrpr.waitForDeployment();
    const wrapperAddress = await guWrpr.getAddress();
    console.log("GenesisUtilsWrapper deployed to:", wrapperAddress);

    // 5. Calculate onchain ID
    console.log("\nStep 5: Calculating onchain ID...");
    const onchainId = await guWrpr.calcOnchainIdFromAddress(DEFAULT_ID_TYPE, signer.address);
    console.log("Calculated onchain ID:", onchainId.toString());

    // Print current state before transition
    try {
      console.log("\nCurrent state check:");
      const defaultIdType = await stateContract.getDefaultIdType();
      console.log("- Default ID type:", defaultIdType);
      const isSupported = await stateContract.isIdTypeSupported(DEFAULT_ID_TYPE);
      console.log("- ID type supported:", isSupported);
    } catch (error: any) {
      console.log("Error checking current state:", error.message);
    }

    // 6. Perform state transition
    console.log("\nStep 6: Performing state transition...");
    const transitionTx = await stateContract.transitStateGeneric(
      onchainId,
      ethers.toBigInt(0),
      ethers.toBigInt("2199023255552"),
      true,
      ethers.toBigInt(1),
      "0x",
      {
        gasLimit: 5000000, // Increased gas limit
      },
    );
    console.log("State transition tx submitted:", transitionTx.hash);
    console.log("Waiting for confirmation...");
    const transitionReceipt = await transitionTx.wait();
    if (transitionReceipt) {
      console.log("State transition confirmed in block:", transitionReceipt.blockNumber);
    } else {
      console.log("State transition confirmation receipt is null");
    }

    // 7. Verify final state
    try {
      console.log("\nStep 7: Verifying final state...");
      const gistRoot = await stateContract.getGISTRoot();
      console.log("Final GIST root:", gistRoot.toString());
    } catch (error: any) {
      console.log("Error getting final state", error);
    }
  } catch (error: any) {
    console.error("Fatal error in main:", error);
    process.exit(1);
  }
}

main();
