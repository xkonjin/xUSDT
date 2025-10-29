/* eslint-disable no-console */
const hre = require("hardhat");

async function main() {
  const feeCollector = process.env.FEE_COLLECTOR;
  const feeBps = Number(process.env.PLATFORM_FEE_BPS || 10);
  if (!feeCollector) throw new Error("FEE_COLLECTOR is required");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());
  console.log("Fee Collector:", feeCollector, "Bps:", feeBps);

  const Router = await hre.ethers.getContractFactory("PlasmaPaymentRouter");
  const router = await Router.deploy(feeCollector, feeBps);
  await router.waitForDeployment();
  const address = await router.getAddress();
  console.log("PlasmaPaymentRouter deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


