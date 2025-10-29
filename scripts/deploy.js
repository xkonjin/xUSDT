/* eslint-disable no-console */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());

  const PaymentRouter = await hre.ethers.getContractFactory("PaymentRouter");
  const router = await PaymentRouter.deploy();
  await router.waitForDeployment();
  const address = await router.getAddress();
  console.log("PaymentRouter deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


