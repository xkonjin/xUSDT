const hre = require("hardhat");

// Example toy seed: emoji handled off-chain; baseURI should point to IPFS folder per toy
const TOYS = [
  // toyId, minPrice(6dp), maxPrice(6dp), rMantissa(1e6), baseURI
  [1, 10000, 10_000_000, 1_150_000, "ipfs://toy1/"], // 0.01 -> 10 USDT0
  [2, 50000, 20_000_000, 1_100_000, "ipfs://toy2/"], // 0.05 -> 20
  [3, 100000, 50_000_000, 1_120_000, "ipfs://toy3/"], // 0.1 -> 50
];

async function main() {
  const addr = process.env.NFT_CONTRACT;
  if (!addr) throw new Error("Set NFT_CONTRACT env");
  const nft = await hre.ethers.getContractAt("TrillionaireToys", addr);
  for (const [toyId, minPrice, maxPrice, r, baseURI] of TOYS) {
    const tx = await nft.configureToy(toyId, minPrice, maxPrice, r, baseURI);
    console.log("configureToy", toyId, "tx=", tx.hash);
    await tx.wait();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
