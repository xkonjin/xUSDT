const { expect } = require("chai");
const { ethers } = require("hardhat");

async function signReceipt(signer, contract, receipt) {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const domain = {
    name: "PlasmaPaymentChannel",
    version: "1",
    chainId,
    verifyingContract: await contract.getAddress(),
  };
  const types = {
    Receipt: [
      { name: "payer", type: "address" },
      { name: "merchant", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "serviceId", type: "bytes32" },
      { name: "nonce", type: "bytes32" },
      { name: "expiry", type: "uint64" },
    ],
  };
  return await signer.signTypedData(domain, types, receipt);
}

describe("PlasmaPaymentChannel", function () {
  it("opens channel, settles a receipt with 0.1% fee, prevents replay, withdraws", async function () {
    const [deployer, payer, merchant, feeCollector] = await ethers.getSigners();

    // Token
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy("Mock USDT", "mUSDT", 6);
    await usdt.waitForDeployment();

    // Mint to payer
    await usdt.connect(deployer).mint(payer.address, 1_000_000);

    // Channel
    const Channel = await ethers.getContractFactory("PlasmaPaymentChannel");
    const channel = await Channel.deploy(await usdt.getAddress(), feeCollector.address, 10);
    await channel.waitForDeployment();

    // Approve + open with 500k
    await usdt.connect(payer).approve(await channel.getAddress(), 1_000_000);
    await channel.connect(payer).open(500_000);
    expect(await channel.channelBalance(payer.address)).to.equal(500_000);

    // Build a receipt
    const receipt = {
      payer: payer.address,
      merchant: merchant.address,
      amount: 100_000,
      serviceId: ethers.encodeBytes32String("svc:premium"),
      nonce: ethers.hexlify(ethers.randomBytes(32)),
      expiry: BigInt(Math.floor(Date.now() / 1000) + 600),
    };
    const sig = await signReceipt(payer, channel, receipt);

    // Settle
    await channel.connect(deployer).settleBatch([receipt], [sig]);

    const fee = Math.floor((receipt.amount * 10) / 10_000); // 100
    const net = receipt.amount - fee; // 99_900

    expect(await usdt.balanceOf(merchant.address)).to.equal(net);
    expect(await usdt.balanceOf(feeCollector.address)).to.equal(fee);
    expect(await channel.channelBalance(payer.address)).to.equal(500_000 - receipt.amount);

    // Replay should fail
    await expect(channel.connect(deployer).settleBatch([receipt], [sig])).to.be.revertedWith("nonce used");

    // Withdraw remainder
    const remaining = await channel.channelBalance(payer.address);
    await channel.connect(payer).withdraw(remaining);
    expect(await channel.channelBalance(payer.address)).to.equal(0);
    expect(await usdt.balanceOf(payer.address)).to.equal(1_000_000 - 500_000 + Number(remaining));
  });
});


