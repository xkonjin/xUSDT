/* eslint-disable no-console */
const hre = require("hardhat");

async function main() {
  const provider = hre.ethers.provider;

  const clientPk = process.env.CLIENT_PRIVATE_KEY;
  const relayerPk = process.env.RELAYER_PRIVATE_KEY || clientPk;
  if (!clientPk) throw new Error("CLIENT_PRIVATE_KEY is required");

  const payer = new hre.ethers.Wallet(clientPk, provider);
  const relayer = new hre.ethers.Wallet(relayerPk, provider);
  const feeCollector = relayer.address;
  const merchant = process.env.MERCHANT_ADDRESS || relayer.address;

  console.log("payer:", payer.address);
  console.log("relayer:", relayer.address);
  console.log("merchant:", merchant);

  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT", relayer);
  const usdt = await MockUSDT.deploy("Mock USDT", "mUSDT", 6);
  await usdt.waitForDeployment();
  console.log("MockUSDT:", await usdt.getAddress());

  const Channel = await hre.ethers.getContractFactory("PlasmaPaymentChannel", relayer);
  const channel = await Channel.deploy(await usdt.getAddress(), feeCollector, 10);
  await channel.waitForDeployment();
  console.log("PlasmaPaymentChannel:", await channel.getAddress());

  // Mint to payer and open channel with 1,000,000 units (1 USDT)
  await (await usdt.mint(payer.address, 2_000_000)).wait();
  await (await usdt.connect(payer).approve(await channel.getAddress(), 2_000_000)).wait();
  await (await channel.connect(payer).open(1_000_000)).wait();
  console.log("Opened channel for", payer.address, "balance:", String(await channel.channelBalance(payer.address)));

  // Print exports for env
  console.log("\n# Export these for Python live test:");
  console.log(`export PLASMA_RPC=http://127.0.0.1:8545`);
  console.log(`export CHANNEL_ADDRESS=${await channel.getAddress()}`);
  console.log(`export MERCHANT_ADDRESS=${merchant}`);
  console.log(`export RELAYER_PRIVATE_KEY=${relayerPk}`);
  console.log(`export CLIENT_PRIVATE_KEY=${clientPk}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});


