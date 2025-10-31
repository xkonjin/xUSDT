const hre = require("hardhat");

// Example toy seed: emoji handled off-chain; baseURI should point to IPFS folder per toy
const TOYS = [
  // toyId, minPrice(6dp), maxPrice(6dp), rMantissa(1e6), baseURI
  [1, 10000, 10_000_000, 1_150_000, "ipfs://toy1/"], // 0.01 -> 10 USDT0
  [2, 50000, 20_000_000, 1_100_000, "ipfs://toy2/"], // 0.05 -> 20
  [3, 100000, 50_000_000, 1_120_000, "ipfs://toy3/"], // 0.1 -> 50
  [4, 20000, 10_000_000, 1_080_000, "ipfs://toy4/"], // 0.02 -> 10
  [5, 30000, 10_000_000, 1_090_000, "ipfs://toy5/"], // 0.03 -> 10
  [6, 200000, 100_000_000, 1_070_000, "ipfs://toy6/"], // 0.2 -> 100
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
