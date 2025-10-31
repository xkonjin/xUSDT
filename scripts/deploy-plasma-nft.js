/* eslint-disable no-console */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());

  const USDT0 = process.env.USDT0_ADDRESS;
  const TREASURY = process.env.MERCHANT_ADDRESS;
  const PRICE = process.env.NFT_PRICE_ATOMIC || "10000"; // default 0.01 USDT0 (6 decimals)

  if (!USDT0 || !TREASURY) throw new Error("USDT0_ADDRESS and MERCHANT_ADDRESS required");

  const NFT = await hre.ethers.getContractFactory("PlasmaReceipt721");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();
  console.log("PlasmaReceipt721:", nftAddr);

  const Router = await hre.ethers.getContractFactory("MerchantNFTRouter");
  const router = await Router.deploy(USDT0, nftAddr, TREASURY, PRICE);
  await router.waitForDeployment();
  const routerAddr = await router.getAddress();
  console.log("MerchantNFTRouter:", routerAddr);

  // set minter
  const tx = await nft.setMinter(routerAddr);
  await tx.wait();
  console.log("Minter set");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });


