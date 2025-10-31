/* eslint-disable no-console */
const hre = require("hardhat");

async function main() {
  const channelAddr = process.env.CHANNEL_ADDRESS;
  const payer = process.env.CLIENT_ADDRESS || process.env.PAYER_ADDRESS;
  if (!channelAddr || !payer) throw new Error("CHANNEL_ADDRESS and (CLIENT_ADDRESS or PAYER_ADDRESS) required");
  const abi = [
    { inputs: [{ internalType: "address", name: "", type: "address" }], name: "channelBalance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  ];
  const contract = await hre.ethers.getContractAt(abi, channelAddr);
  const bal = await contract.channelBalance(payer);
  console.log("channelBalance[", payer, "] =", String(bal));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});


