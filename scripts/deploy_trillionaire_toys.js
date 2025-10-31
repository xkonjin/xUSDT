const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("TrillionaireToys");
  const nft = await Factory.deploy();
  await nft.deployed();
  console.log("TrillionaireToys deployed:", nft.address);

  if (process.env.MERCHANT_ADDRESS) {
    const tx = await nft.setMinter(process.env.MERCHANT_ADDRESS);
    await tx.wait();
    console.log("Minter set to:", process.env.MERCHANT_ADDRESS);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
