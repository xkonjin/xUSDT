/* eslint-disable no-console */
require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  const rpc = process.env.ETH_RPC;
  const clientKey = process.env.CLIENT_PRIVATE_KEY;
  const usdt = process.env.USDT_ADDRESS;
  const router = process.env.ROUTER_ADDRESS;
  const allowanceEnv = process.env.APPROVE_ALLOWANCE || "1000000000000"; // 1e12 (suitable for 6d USDT)

  if (!rpc || !clientKey || !usdt || !router) {
    throw new Error("Missing ETH_RPC, CLIENT_PRIVATE_KEY, USDT_ADDRESS or ROUTER_ADDRESS env var");
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(clientKey, provider);
  const erc20Abi = [
    "function approve(address spender, uint256 value) external returns (bool)",
    "function decimals() view returns (uint8)",
  ];
  const token = new ethers.Contract(usdt, erc20Abi, wallet);

  const decimals = await token.decimals().catch(() => 6);
  const allowance = ethers.toBigInt(allowanceEnv);

  console.log("Payer:", wallet.address);
  console.log("USDT:", usdt);
  console.log("Router:", router);
  console.log("Decimals:", decimals);
  console.log("Approving allowance:", allowance.toString());

  const tx = await token.approve(router, allowance);
  console.log("approve tx:", tx.hash);
  const rcpt = await tx.wait();
  console.log("approved in block:", rcpt.blockNumber);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});


