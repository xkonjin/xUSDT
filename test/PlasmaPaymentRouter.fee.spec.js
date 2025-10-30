const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PlasmaPaymentRouter - fee deduction", function () {
  it("deducts 0.1% fee and forwards net to merchant", async function () {
    const [deployer, payer, merchant, feeCollector] = await ethers.getSigners();

    // Deploy mock token (6 decimals like USDT)
    const MockUSDT = await ethers.getContractFactory("contracts/MockUSDT.sol:MockUSDT");
    const usdt = await MockUSDT.deploy("Mock USDT", "mUSDT", 6);
    await usdt.waitForDeployment();

    // Mint tokens to payer
    await usdt.connect(deployer).mint(payer.address, 1_000_000);

    // Deploy router with 10 bps (0.1%)
    const Router = await ethers.getContractFactory("PlasmaPaymentRouter");
    const router = await Router.deploy(feeCollector.address, 10);
    await router.waitForDeployment();

    // Approve router
    await usdt.connect(payer).approve(await router.getAddress(), 1_000_000);

    // Settle 100_000 units
    const gross = 100_000; // 100k atomic = 0.1 if 6 decimals
    await router
      .connect(deployer)
      .settle(await usdt.getAddress(), payer.address, merchant.address, gross);

    const fee = Math.floor((gross * 10) / 10_000); // 10 bps = 0.1% -> 100
    const net = gross - fee; // 99_900

    expect(await usdt.balanceOf(feeCollector.address)).to.equal(fee);
    expect(await usdt.balanceOf(merchant.address)).to.equal(net);
    expect(await usdt.balanceOf(payer.address)).to.equal(1_000_000 - gross);
  });
});


