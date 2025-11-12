/**
 * Comprehensive On-Chain Tests
 * 
 * Tests all on-chain functionality:
 * - Contract deployments
 * - EIP-712 signing and verification
 * - EIP-3009 transferWithAuthorization
 * - Payment channel operations
 * - Payment router operations
 * - End-to-end payment flows
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("On-Chain Comprehensive Tests", function () {
  /**
   * Fixture: Deploy all contracts and set up test accounts
   */
  async function deployContractsFixture() {
    const [owner, payer, merchant, feeCollector, relayer] = await ethers.getSigners();

    // Deploy MockUSDT (6 decimals like real USDT)
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy("Mock USDT", "USDT", 6);
    await mockUSDT.waitForDeployment();
    const mockUSDTAddress = await mockUSDT.getAddress();

    // Deploy PaymentRouter (Ethereum-style, EIP-712)
    const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
    const paymentRouter = await PaymentRouter.deploy();
    await paymentRouter.waitForDeployment();
    const paymentRouterAddress = await paymentRouter.getAddress();

    // Deploy PlasmaPaymentRouter (direct settlement with fees)
    const PlasmaPaymentRouter = await ethers.getContractFactory("PlasmaPaymentRouter");
    const plasmaPaymentRouter = await PlasmaPaymentRouter.deploy(
      await feeCollector.getAddress(),
      10 // 10 bps = 0.1%
    );
    await plasmaPaymentRouter.waitForDeployment();
    const plasmaPaymentRouterAddress = await plasmaPaymentRouter.getAddress();

    // Deploy PlasmaPaymentChannel (channel-based with EIP-712 receipts)
    const PlasmaPaymentChannel = await ethers.getContractFactory("PlasmaPaymentChannel");
    const plasmaPaymentChannel = await PlasmaPaymentChannel.deploy(
      mockUSDTAddress,
      await feeCollector.getAddress(),
      10 // 10 bps = 0.1%
    );
    await plasmaPaymentChannel.waitForDeployment();
    const plasmaPaymentChannelAddress = await plasmaPaymentChannel.getAddress();

    // Mint tokens to payer for testing
    const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDT
    await mockUSDT.mint(await payer.getAddress(), mintAmount);

    return {
      owner,
      payer,
      merchant,
      feeCollector,
      relayer,
      mockUSDT,
      mockUSDTAddress,
      paymentRouter,
      paymentRouterAddress,
      plasmaPaymentRouter,
      plasmaPaymentRouterAddress,
      plasmaPaymentChannel,
      plasmaPaymentChannelAddress,
      mintAmount,
    };
  }

  describe("Contract Deployments", function () {
    it("Should deploy MockUSDT with correct decimals", async function () {
      const { mockUSDT } = await loadFixture(deployContractsFixture);
      expect(await mockUSDT.decimals()).to.equal(6);
      expect(await mockUSDT.name()).to.equal("Mock USDT");
      expect(await mockUSDT.symbol()).to.equal("USDT");
    });

    it("Should deploy PaymentRouter with correct domain separator", async function () {
      const { paymentRouter } = await loadFixture(deployContractsFixture);
      const domainSeparator = await paymentRouter.DOMAIN_SEPARATOR();
      expect(domainSeparator).to.not.equal(ethers.ZeroHash);
    });

    it("Should deploy PlasmaPaymentRouter with correct fee settings", async function () {
      const { plasmaPaymentRouter, feeCollector } = await loadFixture(deployContractsFixture);
      expect(await plasmaPaymentRouter.feeCollector()).to.equal(await feeCollector.getAddress());
      expect(await plasmaPaymentRouter.platformFeeBps()).to.equal(10);
    });

    it("Should deploy PlasmaPaymentChannel with correct settings", async function () {
      const { plasmaPaymentChannel, mockUSDTAddress, feeCollector } = await loadFixture(deployContractsFixture);
      expect(await plasmaPaymentChannel.token()).to.equal(mockUSDTAddress);
      expect(await plasmaPaymentChannel.feeCollector()).to.equal(await feeCollector.getAddress());
      expect(await plasmaPaymentChannel.platformFeeBps()).to.equal(10);
    });
  });

  describe("MockUSDT Token Operations", function () {
    it("Should mint tokens to payer", async function () {
      const { mockUSDT, payer, mintAmount } = await loadFixture(deployContractsFixture);
      const balance = await mockUSDT.balanceOf(await payer.getAddress());
      expect(balance).to.equal(mintAmount);
    });

    it("Should allow token transfers", async function () {
      const { mockUSDT, payer, merchant } = await loadFixture(deployContractsFixture);
      const transferAmount = ethers.parseUnits("100", 6);
      
      await mockUSDT.connect(payer).transfer(await merchant.getAddress(), transferAmount);
      
      const merchantBalance = await mockUSDT.balanceOf(await merchant.getAddress());
      expect(merchantBalance).to.equal(transferAmount);
    });

    it("Should allow token approvals", async function () {
      const { mockUSDT, payer, paymentRouterAddress } = await loadFixture(deployContractsFixture);
      const approveAmount = ethers.parseUnits("1000", 6);
      
      await mockUSDT.connect(payer).approve(paymentRouterAddress, approveAmount);
      
      const allowance = await mockUSDT.allowance(await payer.getAddress(), paymentRouterAddress);
      expect(allowance).to.equal(approveAmount);
    });
  });

  describe("PaymentRouter (EIP-712 Gasless Transfer)", function () {
    it("Should execute gasless transfer with valid EIP-712 signature", async function () {
      const { mockUSDT, paymentRouter, payer, merchant } = await loadFixture(deployContractsFixture);
      
      const tokenAddress = await mockUSDT.getAddress();
      const routerAddress = await paymentRouter.getAddress();
      const amount = ethers.parseUnits("100", 6);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      // Approve router
      await mockUSDT.connect(payer).approve(routerAddress, amount);
      
      // Get current nonce
      const nonce = await paymentRouter.nonces(await payer.getAddress());
      
      // Build EIP-712 typed data
      const domain = {
        name: "PaymentRouter",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: routerAddress,
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
        token: tokenAddress,
        from: await payer.getAddress(),
        to: await merchant.getAddress(),
        amount: amount,
        nonce: nonce,
        deadline: deadline,
      };
      
      // Sign typed data
      const signature = await payer.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);
      
      // Execute gasless transfer
      await expect(
        paymentRouter.connect(merchant).gaslessTransfer(
          tokenAddress,
          await payer.getAddress(),
          await merchant.getAddress(),
          amount,
          deadline,
          v,
          r,
          s
        )
      ).to.emit(paymentRouter, "PaymentExecuted");
      
      // Verify balances
      const merchantBalance = await mockUSDT.balanceOf(await merchant.getAddress());
      expect(merchantBalance).to.equal(amount);
      
      // Verify nonce incremented
      const newNonce = await paymentRouter.nonces(await payer.getAddress());
      expect(newNonce).to.equal(nonce + 1n);
    });

    it("Should reject expired authorization", async function () {
      const { mockUSDT, paymentRouter, payer, merchant } = await loadFixture(deployContractsFixture);
      
      const tokenAddress = await mockUSDT.getAddress();
      const routerAddress = await paymentRouter.getAddress();
      const amount = ethers.parseUnits("100", 6);
      const deadline = Math.floor(Date.now() / 1000) - 3600; // Expired 1 hour ago
      
      await mockUSDT.connect(payer).approve(routerAddress, amount);
      const nonce = await paymentRouter.nonces(await payer.getAddress());
      
      const domain = {
        name: "PaymentRouter",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: routerAddress,
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
        token: tokenAddress,
        from: await payer.getAddress(),
        to: await merchant.getAddress(),
        amount: amount,
        nonce: nonce,
        deadline: deadline,
      };
      
      const signature = await payer.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);
      
      await expect(
        paymentRouter.connect(merchant).gaslessTransfer(
          tokenAddress,
          await payer.getAddress(),
          await merchant.getAddress(),
          amount,
          deadline,
          v,
          r,
          s
        )
      ).to.be.revertedWith("Payment authorization expired");
    });

    it("Should reject replay attacks (nonce reuse)", async function () {
      const { mockUSDT, paymentRouter, payer, merchant } = await loadFixture(deployContractsFixture);
      
      const tokenAddress = await mockUSDT.getAddress();
      const routerAddress = await paymentRouter.getAddress();
      const amount = ethers.parseUnits("100", 6);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      await mockUSDT.connect(payer).approve(routerAddress, amount * 2n);
      const nonce = await paymentRouter.nonces(await payer.getAddress());
      
      const domain = {
        name: "PaymentRouter",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: routerAddress,
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
        token: tokenAddress,
        from: await payer.getAddress(),
        to: await merchant.getAddress(),
        amount: amount,
        nonce: nonce,
        deadline: deadline,
      };
      
      const signature = await payer.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);
      
      // First execution should succeed
      await paymentRouter.connect(merchant).gaslessTransfer(
        tokenAddress,
        await payer.getAddress(),
        await merchant.getAddress(),
        amount,
        deadline,
        v,
        r,
        s
      );
      
      // Second execution with same signature should fail
      await expect(
        paymentRouter.connect(merchant).gaslessTransfer(
          tokenAddress,
          await payer.getAddress(),
          await merchant.getAddress(),
          amount,
          deadline,
          v,
          r,
          s
        )
      ).to.be.revertedWith("Invalid signature");
    });
  });

  describe("PlasmaPaymentRouter (Direct Settlement)", function () {
    it("Should settle payment with fee deduction", async function () {
      const { mockUSDT, plasmaPaymentRouter, payer, merchant, feeCollector } = await loadFixture(deployContractsFixture);
      
      const routerAddress = await plasmaPaymentRouter.getAddress();
      const tokenAddress = await mockUSDT.getAddress();
      const grossAmount = ethers.parseUnits("1000", 6); // 1000 USDT
      const expectedFee = grossAmount * 10n / 10000n; // 10 bps = 0.1 USDT
      const expectedNet = grossAmount - expectedFee;
      
      // Approve router
      await mockUSDT.connect(payer).approve(routerAddress, grossAmount);
      
      // Get initial balances
      const initialMerchantBalance = await mockUSDT.balanceOf(await merchant.getAddress());
      const initialFeeCollectorBalance = await mockUSDT.balanceOf(await feeCollector.getAddress());
      
      // Execute settlement
      await expect(
        plasmaPaymentRouter.connect(merchant).settle(
          tokenAddress,
          await payer.getAddress(),
          await merchant.getAddress(),
          grossAmount
        )
      ).to.emit(plasmaPaymentRouter, "Settled");
      
      // Verify balances
      const finalMerchantBalance = await mockUSDT.balanceOf(await merchant.getAddress());
      const finalFeeCollectorBalance = await mockUSDT.balanceOf(await feeCollector.getAddress());
      
      expect(finalMerchantBalance - initialMerchantBalance).to.equal(expectedNet);
      expect(finalFeeCollectorBalance - initialFeeCollectorBalance).to.equal(expectedFee);
    });

    it("Should allow owner to update fee collector", async function () {
      const { plasmaPaymentRouter, owner, payer } = await loadFixture(deployContractsFixture);
      
      const newFeeCollector = await payer.getAddress();
      
      await expect(
        plasmaPaymentRouter.connect(owner).setFeeCollector(newFeeCollector)
      ).to.emit(plasmaPaymentRouter, "FeeCollectorUpdated");
      
      expect(await plasmaPaymentRouter.feeCollector()).to.equal(newFeeCollector);
    });

    it("Should allow owner to update platform fee", async function () {
      const { plasmaPaymentRouter, owner } = await loadFixture(deployContractsFixture);
      
      const newFeeBps = 20; // 0.2%
      
      await expect(
        plasmaPaymentRouter.connect(owner).setPlatformFeeBps(newFeeBps)
      ).to.emit(plasmaPaymentRouter, "PlatformFeeUpdated");
      
      expect(await plasmaPaymentRouter.platformFeeBps()).to.equal(newFeeBps);
    });

    it("Should reject fee updates > 100%", async function () {
      const { plasmaPaymentRouter, owner } = await loadFixture(deployContractsFixture);
      
      await expect(
        plasmaPaymentRouter.connect(owner).setPlatformFeeBps(10001)
      ).to.be.revertedWith("bps>100%");
    });
  });

  describe("PlasmaPaymentChannel (Channel-Based Payments)", function () {
    it("Should open channel with deposit", async function () {
      const { mockUSDT, plasmaPaymentChannel, payer } = await loadFixture(deployContractsFixture);
      
      const channelAddress = await plasmaPaymentChannel.getAddress();
      const depositAmount = ethers.parseUnits("5000", 6);
      
      // Approve channel
      await mockUSDT.connect(payer).approve(channelAddress, depositAmount);
      
      // Open channel
      await expect(
        plasmaPaymentChannel.connect(payer).open(depositAmount)
      ).to.emit(plasmaPaymentChannel, "ChannelOpened");
      
      // Verify channel balance
      const channelBalance = await plasmaPaymentChannel.channelBalance(await payer.getAddress());
      expect(channelBalance).to.equal(depositAmount);
    });

    it("Should top up existing channel", async function () {
      const { mockUSDT, plasmaPaymentChannel, payer } = await loadFixture(deployContractsFixture);
      
      const channelAddress = await plasmaPaymentChannel.getAddress();
      const initialDeposit = ethers.parseUnits("5000", 6);
      const topUpAmount = ethers.parseUnits("2000", 6);
      
      // Open channel
      await mockUSDT.connect(payer).approve(channelAddress, initialDeposit + topUpAmount);
      await plasmaPaymentChannel.connect(payer).open(initialDeposit);
      
      // Top up
      await expect(
        plasmaPaymentChannel.connect(payer).topUp(topUpAmount)
      ).to.emit(plasmaPaymentChannel, "ChannelFunded");
      
      // Verify total balance
      const channelBalance = await plasmaPaymentChannel.channelBalance(await payer.getAddress());
      expect(channelBalance).to.equal(initialDeposit + topUpAmount);
    });

    it("Should withdraw from channel", async function () {
      const { mockUSDT, plasmaPaymentChannel, payer } = await loadFixture(deployContractsFixture);
      
      const channelAddress = await plasmaPaymentChannel.getAddress();
      const depositAmount = ethers.parseUnits("5000", 6);
      const withdrawAmount = ethers.parseUnits("1000", 6);
      
      // Open channel
      await mockUSDT.connect(payer).approve(channelAddress, depositAmount);
      await plasmaPaymentChannel.connect(payer).open(depositAmount);
      
      // Get initial balance
      const initialBalance = await mockUSDT.balanceOf(await payer.getAddress());
      
      // Withdraw
      await expect(
        plasmaPaymentChannel.connect(payer).withdraw(withdrawAmount)
      ).to.emit(plasmaPaymentChannel, "Withdrawn");
      
      // Verify channel balance decreased
      const channelBalance = await plasmaPaymentChannel.channelBalance(await payer.getAddress());
      expect(channelBalance).to.equal(depositAmount - withdrawAmount);
      
      // Verify payer balance increased
      const finalBalance = await mockUSDT.balanceOf(await payer.getAddress());
      expect(finalBalance - initialBalance).to.equal(withdrawAmount);
    });

    it("Should settle receipt batch with EIP-712 signatures", async function () {
      const { mockUSDT, plasmaPaymentChannel, payer, merchant, feeCollector } = await loadFixture(deployContractsFixture);
      
      const channelAddress = await plasmaPaymentChannel.getAddress();
      const depositAmount = ethers.parseUnits("10000", 6);
      const receiptAmount = ethers.parseUnits("1000", 6);
      const expectedFee = receiptAmount * 10n / 10000n; // 10 bps
      const expectedNet = receiptAmount - expectedFee;
      
      // Open channel
      await mockUSDT.connect(payer).approve(channelAddress, depositAmount);
      await plasmaPaymentChannel.connect(payer).open(depositAmount);
      
      // Build receipt
      const nonce = ethers.randomBytes(32);
      const serviceId = ethers.randomBytes(32);
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      
      const receipt = {
        payer: await payer.getAddress(),
        merchant: await merchant.getAddress(),
        amount: receiptAmount,
        serviceId: serviceId,
        nonce: nonce,
        expiry: expiry,
      };
      
      // Build EIP-712 typed data
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      const domain = {
        name: "PlasmaPaymentChannel",
        version: "1",
        chainId: chainId,
        verifyingContract: channelAddress,
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
      
      // Sign receipt
      const signature = await payer.signTypedData(domain, types, receipt);
      
      // Get initial balances
      const initialMerchantBalance = await mockUSDT.balanceOf(await merchant.getAddress());
      const initialFeeCollectorBalance = await mockUSDT.balanceOf(await feeCollector.getAddress());
      
      // Settle batch
      await expect(
        plasmaPaymentChannel.connect(merchant).settleBatch([receipt], [signature])
      ).to.emit(plasmaPaymentChannel, "ReceiptSettled");
      
      // Verify balances
      const finalMerchantBalance = await mockUSDT.balanceOf(await merchant.getAddress());
      const finalFeeCollectorBalance = await mockUSDT.balanceOf(await feeCollector.getAddress());
      
      expect(finalMerchantBalance - initialMerchantBalance).to.equal(expectedNet);
      expect(finalFeeCollectorBalance - initialFeeCollectorBalance).to.equal(expectedFee);
      
      // Verify channel balance decreased
      const channelBalance = await plasmaPaymentChannel.channelBalance(await payer.getAddress());
      expect(channelBalance).to.equal(depositAmount - receiptAmount);
      
      // Verify nonce marked as used
      const nonceUsed = await plasmaPaymentChannel.nonceUsed(await payer.getAddress(), nonce);
      expect(nonceUsed).to.be.true;
    });

    it("Should reject expired receipts", async function () {
      const { mockUSDT, plasmaPaymentChannel, payer, merchant } = await loadFixture(deployContractsFixture);
      
      const channelAddress = await plasmaPaymentChannel.getAddress();
      const depositAmount = ethers.parseUnits("10000", 6);
      const receiptAmount = ethers.parseUnits("1000", 6);
      
      // Open channel
      await mockUSDT.connect(payer).approve(channelAddress, depositAmount);
      await plasmaPaymentChannel.connect(payer).open(depositAmount);
      
      // Build expired receipt
      const nonce = ethers.randomBytes(32);
      const serviceId = ethers.randomBytes(32);
      const expiry = Math.floor(Date.now() / 1000) - 3600; // Expired
      
      const receipt = {
        payer: await payer.getAddress(),
        merchant: await merchant.getAddress(),
        amount: receiptAmount,
        serviceId: serviceId,
        nonce: nonce,
        expiry: expiry,
      };
      
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      const domain = {
        name: "PlasmaPaymentChannel",
        version: "1",
        chainId: chainId,
        verifyingContract: channelAddress,
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
      
      const signature = await payer.signTypedData(domain, types, receipt);
      
      await expect(
        plasmaPaymentChannel.connect(merchant).settleBatch([receipt], [signature])
      ).to.be.revertedWith("expired");
    });

    it("Should reject duplicate nonce usage", async function () {
      const { mockUSDT, plasmaPaymentChannel, payer, merchant } = await loadFixture(deployContractsFixture);
      
      const channelAddress = await plasmaPaymentChannel.getAddress();
      const depositAmount = ethers.parseUnits("10000", 6);
      const receiptAmount = ethers.parseUnits("1000", 6);
      
      // Open channel
      await mockUSDT.connect(payer).approve(channelAddress, depositAmount);
      await plasmaPaymentChannel.connect(payer).open(depositAmount);
      
      // Build receipt
      const nonce = ethers.randomBytes(32);
      const serviceId = ethers.randomBytes(32);
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      
      const receipt = {
        payer: await payer.getAddress(),
        merchant: await merchant.getAddress(),
        amount: receiptAmount,
        serviceId: serviceId,
        nonce: nonce,
        expiry: expiry,
      };
      
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      const domain = {
        name: "PlasmaPaymentChannel",
        version: "1",
        chainId: chainId,
        verifyingContract: channelAddress,
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
      
      const signature = await payer.signTypedData(domain, types, receipt);
      
      // First settlement should succeed
      await plasmaPaymentChannel.connect(merchant).settleBatch([receipt], [signature]);
      
      // Second settlement with same nonce should fail
      await expect(
        plasmaPaymentChannel.connect(merchant).settleBatch([receipt], [signature])
      ).to.be.revertedWith("nonce used");
    });

    it("Should reject underfunded channel settlements", async function () {
      const { mockUSDT, plasmaPaymentChannel, payer, merchant } = await loadFixture(deployContractsFixture);
      
      const channelAddress = await plasmaPaymentChannel.getAddress();
      const depositAmount = ethers.parseUnits("1000", 6);
      const receiptAmount = ethers.parseUnits("2000", 6); // More than deposited
      
      // Open channel with insufficient funds
      await mockUSDT.connect(payer).approve(channelAddress, depositAmount);
      await plasmaPaymentChannel.connect(payer).open(depositAmount);
      
      // Build receipt
      const nonce = ethers.randomBytes(32);
      const serviceId = ethers.randomBytes(32);
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      
      const receipt = {
        payer: await payer.getAddress(),
        merchant: await merchant.getAddress(),
        amount: receiptAmount,
        serviceId: serviceId,
        nonce: nonce,
        expiry: expiry,
      };
      
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      const domain = {
        name: "PlasmaPaymentChannel",
        version: "1",
        chainId: chainId,
        verifyingContract: channelAddress,
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
      
      const signature = await payer.signTypedData(domain, types, receipt);
      
      await expect(
        plasmaPaymentChannel.connect(merchant).settleBatch([receipt], [signature])
      ).to.be.revertedWith("channel underfunded");
    });

    it("Should allow owner to update fee collector", async function () {
      const { plasmaPaymentChannel, owner, payer } = await loadFixture(deployContractsFixture);
      
      const newFeeCollector = await payer.getAddress();
      
      await expect(
        plasmaPaymentChannel.connect(owner).setFeeCollector(newFeeCollector)
      ).to.emit(plasmaPaymentChannel, "FeeCollectorUpdated");
      
      expect(await plasmaPaymentChannel.feeCollector()).to.equal(newFeeCollector);
    });

    it("Should allow owner to update platform fee", async function () {
      const { plasmaPaymentChannel, owner } = await loadFixture(deployContractsFixture);
      
      const newFeeBps = 20; // 0.2%
      
      await expect(
        plasmaPaymentChannel.connect(owner).setPlatformFeeBps(newFeeBps)
      ).to.emit(plasmaPaymentChannel, "PlatformFeeUpdated");
      
      expect(await plasmaPaymentChannel.platformFeeBps()).to.equal(newFeeBps);
    });
  });

  describe("End-to-End Payment Flows", function () {
    it("Should complete full payment flow: approve -> sign -> execute", async function () {
      const { mockUSDT, paymentRouter, payer, merchant } = await loadFixture(deployContractsFixture);
      
      const tokenAddress = await mockUSDT.getAddress();
      const routerAddress = await paymentRouter.getAddress();
      const amount = ethers.parseUnits("500", 6);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // Step 1: Approve
      await mockUSDT.connect(payer).approve(routerAddress, amount);
      const allowance = await mockUSDT.allowance(await payer.getAddress(), routerAddress);
      expect(allowance).to.equal(amount);
      
      // Step 2: Sign
      const nonce = await paymentRouter.nonces(await payer.getAddress());
      const domain = {
        name: "PaymentRouter",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: routerAddress,
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
        token: tokenAddress,
        from: await payer.getAddress(),
        to: await merchant.getAddress(),
        amount: amount,
        nonce: nonce,
        deadline: deadline,
      };
      const signature = await payer.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);
      
      // Step 3: Execute
      const initialBalance = await mockUSDT.balanceOf(await merchant.getAddress());
      await paymentRouter.connect(merchant).gaslessTransfer(
        tokenAddress,
        await payer.getAddress(),
        await merchant.getAddress(),
        amount,
        deadline,
        v,
        r,
        s
      );
      const finalBalance = await mockUSDT.balanceOf(await merchant.getAddress());
      expect(finalBalance - initialBalance).to.equal(amount);
    });

    it("Should complete channel-based payment flow: open -> sign receipt -> settle", async function () {
      const { mockUSDT, plasmaPaymentChannel, payer, merchant, feeCollector } = await loadFixture(deployContractsFixture);
      
      const channelAddress = await plasmaPaymentChannel.getAddress();
      const depositAmount = ethers.parseUnits("5000", 6);
      const receiptAmount = ethers.parseUnits("1000", 6);
      
      // Step 1: Open channel
      await mockUSDT.connect(payer).approve(channelAddress, depositAmount);
      await plasmaPaymentChannel.connect(payer).open(depositAmount);
      
      // Step 2: Sign receipt
      const nonce = ethers.randomBytes(32);
      const serviceId = ethers.randomBytes(32);
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      
      const receipt = {
        payer: await payer.getAddress(),
        merchant: await merchant.getAddress(),
        amount: receiptAmount,
        serviceId: serviceId,
        nonce: nonce,
        expiry: expiry,
      };
      
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      const domain = {
        name: "PlasmaPaymentChannel",
        version: "1",
        chainId: chainId,
        verifyingContract: channelAddress,
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
      const signature = await payer.signTypedData(domain, types, receipt);
      
      // Step 3: Settle
      const initialMerchantBalance = await mockUSDT.balanceOf(await merchant.getAddress());
      await plasmaPaymentChannel.connect(merchant).settleBatch([receipt], [signature]);
      const finalMerchantBalance = await mockUSDT.balanceOf(await merchant.getAddress());
      
      const expectedFee = receiptAmount * 10n / 10000n;
      const expectedNet = receiptAmount - expectedFee;
      expect(finalMerchantBalance - initialMerchantBalance).to.equal(expectedNet);
    });
  });
});

