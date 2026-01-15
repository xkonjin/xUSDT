const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PlasmaPaymentRouter - fee deduction", function () {
  let deployer, payer, merchant, feeCollector, newCollector;
  let usdt, router;

  beforeEach(async function () {
    [deployer, payer, merchant, feeCollector, newCollector] = await ethers.getSigners();

    // Deploy mock token (6 decimals like USDT)
    const MockUSDT = await ethers.getContractFactory("contracts/MockUSDT.sol:MockUSDT");
    usdt = await MockUSDT.deploy("Mock USDT", "mUSDT", 6);
    await usdt.waitForDeployment();

    // Mint tokens to payer
    await usdt.connect(deployer).mint(payer.address, 1_000_000);

    // Deploy router with 10 bps (0.1%)
    const Router = await ethers.getContractFactory("PlasmaPaymentRouter");
    router = await Router.deploy(feeCollector.address, 10);
    await router.waitForDeployment();

    // Approve router
    await usdt.connect(payer).approve(await router.getAddress(), 1_000_000);
  });

  it("deducts 0.1% fee and forwards net to merchant", async function () {
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

  // =========================================================================
  // Admin Function Tests (Issue #217)
  // =========================================================================

  describe("setFeeCollector", function () {
    it("allows owner to update fee collector address", async function () {
      await router.connect(deployer).setFeeCollector(newCollector.address);
      expect(await router.feeCollector()).to.equal(newCollector.address);
    });

    it("emits FeeCollectorUpdated event", async function () {
      await expect(router.connect(deployer).setFeeCollector(newCollector.address))
        .to.emit(router, "FeeCollectorUpdated")
        .withArgs(feeCollector.address, newCollector.address);
    });

    it("reverts when called by non-owner", async function () {
      await expect(
        router.connect(payer).setFeeCollector(newCollector.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("reverts when setting zero address", async function () {
      await expect(
        router.connect(deployer).setFeeCollector(ethers.ZeroAddress)
      ).to.be.revertedWith("collector=0");
    });

    it("routes fees to new collector after update", async function () {
      await router.connect(deployer).setFeeCollector(newCollector.address);
      
      const gross = 100_000;
      await router.connect(deployer).settle(
        await usdt.getAddress(), payer.address, merchant.address, gross
      );
      
      const fee = Math.floor((gross * 10) / 10_000);
      expect(await usdt.balanceOf(newCollector.address)).to.equal(fee);
      expect(await usdt.balanceOf(feeCollector.address)).to.equal(0);
    });
  });

  describe("setPlatformFeeBps", function () {
    it("allows owner to update fee bps", async function () {
      await router.connect(deployer).setPlatformFeeBps(50); // 0.5%
      expect(await router.platformFeeBps()).to.equal(50);
    });

    it("emits PlatformFeeUpdated event", async function () {
      await expect(router.connect(deployer).setPlatformFeeBps(50))
        .to.emit(router, "PlatformFeeUpdated")
        .withArgs(10, 50);
    });

    it("reverts when called by non-owner", async function () {
      await expect(
        router.connect(payer).setPlatformFeeBps(50)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("reverts when bps exceeds 100%", async function () {
      await expect(
        router.connect(deployer).setPlatformFeeBps(10001)
      ).to.be.revertedWith("bps>100%");
    });

    it("allows setting fee to maximum (100%)", async function () {
      await router.connect(deployer).setPlatformFeeBps(10000);
      expect(await router.platformFeeBps()).to.equal(10000);
    });

    it("allows setting fee to zero", async function () {
      await router.connect(deployer).setPlatformFeeBps(0);
      expect(await router.platformFeeBps()).to.equal(0);
      
      // Settle and verify no fee is taken
      const gross = 100_000;
      await router.connect(deployer).settle(
        await usdt.getAddress(), payer.address, merchant.address, gross
      );
      
      expect(await usdt.balanceOf(feeCollector.address)).to.equal(0);
      expect(await usdt.balanceOf(merchant.address)).to.equal(gross);
    });

    it("applies new fee rate to subsequent settlements", async function () {
      await router.connect(deployer).setPlatformFeeBps(100); // 1%
      
      const gross = 100_000;
      await router.connect(deployer).settle(
        await usdt.getAddress(), payer.address, merchant.address, gross
      );
      
      const fee = Math.floor((gross * 100) / 10_000); // 1% = 1000
      expect(await usdt.balanceOf(feeCollector.address)).to.equal(fee);
      expect(await usdt.balanceOf(merchant.address)).to.equal(gross - fee);
    });
  });

  describe("constructor validation", function () {
    it("reverts with zero fee collector address", async function () {
      const Router = await ethers.getContractFactory("PlasmaPaymentRouter");
      await expect(
        Router.deploy(ethers.ZeroAddress, 10)
      ).to.be.revertedWith("feeCollector=0");
    });

    it("reverts with bps over 100%", async function () {
      const Router = await ethers.getContractFactory("PlasmaPaymentRouter");
      await expect(
        Router.deploy(feeCollector.address, 10001)
      ).to.be.revertedWith("bps>100%");
    });
  });
});


