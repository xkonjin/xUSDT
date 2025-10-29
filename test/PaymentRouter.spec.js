const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaymentRouter", function () {
  it("pulls USDT with valid EIP-712 signature and blocks replays", async function () {
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

    await expect(
      router
        .connect(deployer)
        .gaslessTransfer(token, message.from, message.to, amount, deadline, v, r, s)
    ).to.emit(router, "PaymentExecuted");

    expect(await usdt.balanceOf(await merchant.getAddress())).to.equal(amount);
    expect(await router.nonces(await payer.getAddress())).to.equal(nonce + 1n);

    await expect(
      router
        .connect(deployer)
        .gaslessTransfer(token, message.from, message.to, amount, deadline, v, r, s)
    ).to.be.reverted;

    const latest = await ethers.provider.getBlock('latest');
    const expired = Number(latest.timestamp) - 1;
    const msg2 = { ...message, nonce: Number(nonce) + 1, deadline: expired };
    const sig2 = await payer.signTypedData(domain, types, msg2);
    const { v: v2, r: r2, s: s2 } = ethers.Signature.from(sig2);
    await expect(
      router
        .connect(deployer)
        .gaslessTransfer(token, msg2.from, msg2.to, amount, expired, v2, r2, s2)
    ).to.be.revertedWith("Payment authorization expired");
  });
});


