
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaymentRouter", function () {
    let paymentRouter, token, owner, merchant, payer;

    beforeEach(async function () {
        [owner, merchant, payer] = await ethers.getSigners();

        const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
        paymentRouter = await PaymentRouter.deploy();

        const MockERC20 = await ethers.getContractFactory("MockERC20");
        token = await MockERC20.deploy("Mock Token", "MTKN", ethers.parseEther("1000000"));

        await token.transfer(payer.address, ethers.parseEther("1000"));
        await token.connect(payer).approve(paymentRouter.address, ethers.parseEther("1000"));
    });

    it("Should process a valid payment", async function () {
        const amount = ethers.parseEther("100");
        const invoiceId = ethers.id("invoice-123");
        const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

        const nonce = await paymentRouter.nonces(payer.address);

        const domain = {
            name: "PaymentRouter",
            version: "1",
            chainId: (await ethers.provider.getNetwork()).chainId,
            verifyingContract: paymentRouter.address
        };

        const types = {
            Payment: [
                { name: "token", type: "address" },
                { name: "merchant", type: "address" },
                { name: "amount", type: "uint256" },
                { name: "invoiceId", type: "bytes32" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" }
            ]
        };

        const value = {
            token: token.address,
            merchant: merchant.address,
            amount: amount,
            invoiceId: invoiceId,
            nonce: nonce,
            deadline: deadline
        };

        const signature = await payer.signTypedData(domain, types, value);

        await expect(paymentRouter.connect(payer).pay(token.address, merchant.address, amount, invoiceId, deadline, signature))
            .to.emit(paymentRouter, "PaymentReceived")
            .withArgs(invoiceId, merchant.address, payer.address, token.address, amount, (await ethers.provider.getBlock("latest")).timestamp);

        expect(await token.balanceOf(merchant.address)).to.equal(amount);
    });

    it("Should reject a replayed payment with the same nonce", async function () {
        const amount = ethers.parseEther("100");
        const invoiceId = ethers.id("invoice-123");
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        const nonce = await paymentRouter.nonces(payer.address);

        const domain = {
            name: "PaymentRouter",
            version: "1",
            chainId: (await ethers.provider.getNetwork()).chainId,
            verifyingContract: paymentRouter.address
        };

        const types = {
            Payment: [
                { name: "token", type: "address" },
                { name: "merchant", type: "address" },
                { name: "amount", type: "uint256" },
                { name: "invoiceId", type: "bytes32" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" }
            ]
        };

        const value = {
            token: token.address,
            merchant: merchant.address,
            amount: amount,
            invoiceId: invoiceId,
            nonce: nonce,
            deadline: deadline
        };

        const signature = await payer.signTypedData(domain, types, value);

        await paymentRouter.connect(payer).pay(token.address, merchant.address, amount, invoiceId, deadline, signature);

        await expect(paymentRouter.connect(payer).pay(token.address, merchant.address, amount, invoiceId, deadline, signature))
            .to.be.revertedWith("PaymentRouter: invalid signature");
    });

    it("Should reject a payment with a manipulated signature", async function () {
        const amount = ethers.parseEther("100");
        const invoiceId = ethers.id("invoice-123");
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        const nonce = await paymentRouter.nonces(payer.address);

        const domain = {
            name: "PaymentRouter",
            version: "1",
            chainId: (await ethers.provider.getNetwork()).chainId,
            verifyingContract: paymentRouter.address
        };

        const types = {
            Payment: [
                { name: "token", type: "address" },
                { name: "merchant", type: "address" },
                { name: "amount", type: "uint256" },
                { name: "invoiceId", type: "bytes32" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" }
            ]
        };

        const value = {
            token: token.address,
            merchant: merchant.address,
            amount: amount,
            invoiceId: invoiceId,
            nonce: nonce,
            deadline: deadline
        };

        const signature = await payer.signTypedData(domain, types, value);

        // Manipulate the signature
        const manipulatedSignature = signature.slice(0, -2) + "00";

        await expect(paymentRouter.connect(payer).pay(token.address, merchant.address, amount, invoiceId, deadline, manipulatedSignature))
            .to.be.revertedWith("ECDSA: invalid signature");
    });
});
