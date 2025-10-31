/*
 Deploy NFTPlasma to Plasma network (or any configured network).

 Usage:
   PLASMA_RPC=... RELAYER_PRIVATE_KEY=0x... \
   NFT_NAME="PremiumPass" NFT_SYMBOL="PPASS" \
   npx hardhat run scripts/deploy_nft.js --network plasma
*/

const hre = require("hardhat");

async function main() {
  const name = process.env.NFT_NAME || "PremiumPass";
  const symbol = process.env.NFT_SYMBOL || "PPASS";

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying NFTPlasma with:", {
    network: hre.network.name,
    deployer: deployer.address,
    name,
    symbol,
  });

  const factory = await hre.ethers.getContractFactory("NFTPlasma");
  const nft = await factory.deploy(name, symbol, deployer.address);
  await nft.waitForDeployment();
  console.log("NFTPlasma deployed:", await nft.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


