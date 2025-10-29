/* eslint-disable no-console */
const hre = require("hardhat");

async function main() {
  const token = process.env.CHANNEL_TOKEN; // e.g., USDT₀ address on Plasma
  const feeCollector = process.env.FEE_COLLECTOR;
  const feeBps = Number(process.env.PLATFORM_FEE_BPS || 10);
  if (!token) throw new Error("CHANNEL_TOKEN is required");
  if (!feeCollector) throw new Error("FEE_COLLECTOR is required");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());
  console.log("Token:", token, "Fee Collector:", feeCollector, "Bps:", feeBps);

  const Channel = await hre.ethers.getContractFactory("PlasmaPaymentChannel");
  const channel = await Channel.deploy(token, feeCollector, feeBps);
  await channel.waitForDeployment();
  const address = await channel.getAddress();
  console.log("PlasmaPaymentChannel deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


