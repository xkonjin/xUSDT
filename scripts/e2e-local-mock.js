/* eslint-disable no-console */
const { ethers } = require("hardhat");

async function main() {
  const [deployer, payer, merchant] = await ethers.getSigners();

  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy("USD Tether", "USDT", 6);
  await usdt.waitForDeployment();

  const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
  const router = await PaymentRouter.deploy();
  await router.waitForDeployment();

  const token = await usdt.getAddress();
  const routerAddr = await router.getAddress();

  const amount = 1_000_000n; // 1 USDT (6 decimals)
  await usdt.mint(await payer.getAddress(), amount);
  await usdt.connect(payer).approve(routerAddr, amount);

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const deadline = Math.floor(Date.now() / 1000) + 600;
  const nonce = await router.nonces(await payer.getAddress());

  const domain = {
    name: "PaymentRouter",
    version: "1",
    chainId,
    verifyingContract: routerAddr,
  };

  const types = {
    Transfer: [
      { name: "token", type: "address" },
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const message = {
    token,
    from: await payer.getAddress(),
    to: await merchant.getAddress(),
    amount,
    nonce: Number(nonce),
    deadline,
  };

  const sig = await payer.signTypedData(domain, types, message);
  const { v, r, s } = ethers.Signature.from(sig);

  const tx = await router
    .connect(deployer)
    .gaslessTransfer(token, message.from, message.to, amount, deadline, v, r, s);
  const rcpt = await tx.wait();

  console.log("Router:", routerAddr);
  console.log("USDT:", token);
  console.log("Payer:", await payer.getAddress());
  console.log("Merchant:", await merchant.getAddress());
  console.log("Tx Hash:", rcpt.hash);
  console.log("Merchant Balance:", (await usdt.balanceOf(await merchant.getAddress())).toString());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});


