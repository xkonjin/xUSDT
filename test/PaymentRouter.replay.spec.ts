/**
 * PaymentRouter Replay Attack Tests
 * 
 * CRITICAL: These tests verify that the PaymentRouter correctly prevents
 * replay attacks on EIP-712 signed authorizations.
 * 
 * This file completes the incomplete replay attack test identified in the audit.
 */

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { PaymentRouter, MockUSDT } from '../typechain-types';

describe('PaymentRouter Replay Attack Prevention', function () {
  let paymentRouter: PaymentRouter;
  let mockUSDT: MockUSDT;
  let owner: SignerWithAddress;
  let sender: SignerWithAddress;
  let recipient: SignerWithAddress;
  let relayer: SignerWithAddress;

  // EIP-712 domain
  const DOMAIN_NAME = 'PaymentRouter';
  const DOMAIN_VERSION = '1';

  // Test amounts
  const INITIAL_BALANCE = ethers.parseUnits('10000', 6); // 10,000 USDT
  const TRANSFER_AMOUNT = ethers.parseUnits('100', 6); // 100 USDT

  beforeEach(async function () {
    [owner, sender, recipient, relayer] = await ethers.getSigners();

    // Deploy MockUSDT
    const MockUSDT = await ethers.getContractFactory('MockUSDT');
    mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();

    // Deploy PaymentRouter
    const PaymentRouter = await ethers.getContractFactory('PaymentRouter');
    paymentRouter = await PaymentRouter.deploy(await mockUSDT.getAddress());
    await paymentRouter.waitForDeployment();

    // Fund sender with tokens
    await mockUSDT.mint(sender.address, INITIAL_BALANCE);

    // Approve PaymentRouter to spend sender's tokens
    await mockUSDT.connect(sender).approve(
      await paymentRouter.getAddress(),
      ethers.MaxUint256
    );
  });

  /**
   * Helper function to create EIP-712 typed data for transfer authorization
   */
  async function createTransferAuthorization(
    from: string,
    to: string,
    value: bigint,
    validAfter: number,
    validBefore: number,
    nonce: string
  ) {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const routerAddress = await paymentRouter.getAddress();

    const domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: chainId,
      verifyingContract: routerAddress,
    };

    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    const message = {
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
    };

    return { domain, types, message };
  }

  /**
   * Helper function to generate a random nonce
   */
  function generateNonce(): string {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  /**
   * Helper function to get current timestamp
   */
  async function getCurrentTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock('latest');
    return block!.timestamp;
  }

  describe('Nonce-Based Replay Prevention', function () {
    it('should successfully process a valid transfer authorization', async function () {
      const currentTime = await getCurrentTimestamp();
      const nonce = generateNonce();

      const { domain, types, message } = await createTransferAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60, // Valid from 1 minute ago
        currentTime + 3600, // Valid for 1 hour
        nonce
      );

      // Sign the authorization
      const signature = await sender.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // Execute the transfer
      await expect(
        paymentRouter.connect(relayer).settleWithAuthorization(
          sender.address,
          recipient.address,
          TRANSFER_AMOUNT,
          currentTime - 60,
          currentTime + 3600,
          nonce,
          v,
          r,
          s
        )
      ).to.emit(paymentRouter, 'TransferSettled');

      // Verify balances
      expect(await mockUSDT.balanceOf(recipient.address)).to.equal(TRANSFER_AMOUNT);
    });

    it('should reject replay of the same authorization (same nonce)', async function () {
      const currentTime = await getCurrentTimestamp();
      const nonce = generateNonce();

      const { domain, types, message } = await createTransferAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce
      );

      const signature = await sender.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // First transfer should succeed
      await paymentRouter.connect(relayer).settleWithAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce,
        v,
        r,
        s
      );

      // Second transfer with same nonce should fail
      await expect(
        paymentRouter.connect(relayer).settleWithAuthorization(
          sender.address,
          recipient.address,
          TRANSFER_AMOUNT,
          currentTime - 60,
          currentTime + 3600,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWith('Authorization already used');
    });

    it('should reject replay even with different relayer', async function () {
      const currentTime = await getCurrentTimestamp();
      const nonce = generateNonce();

      const { domain, types, message } = await createTransferAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce
      );

      const signature = await sender.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // First transfer by relayer
      await paymentRouter.connect(relayer).settleWithAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce,
        v,
        r,
        s
      );

      // Second transfer by owner (different relayer) should still fail
      await expect(
        paymentRouter.connect(owner).settleWithAuthorization(
          sender.address,
          recipient.address,
          TRANSFER_AMOUNT,
          currentTime - 60,
          currentTime + 3600,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWith('Authorization already used');
    });

    it('should allow different nonces for the same sender/recipient/amount', async function () {
      const currentTime = await getCurrentTimestamp();
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      // First authorization
      const auth1 = await createTransferAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce1
      );
      const sig1 = await sender.signTypedData(auth1.domain, auth1.types, auth1.message);
      const { v: v1, r: r1, s: s1 } = ethers.Signature.from(sig1);

      // Second authorization with different nonce
      const auth2 = await createTransferAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce2
      );
      const sig2 = await sender.signTypedData(auth2.domain, auth2.types, auth2.message);
      const { v: v2, r: r2, s: s2 } = ethers.Signature.from(sig2);

      // Both should succeed
      await paymentRouter.connect(relayer).settleWithAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce1,
        v1,
        r1,
        s1
      );

      await paymentRouter.connect(relayer).settleWithAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce2,
        v2,
        r2,
        s2
      );

      // Verify both transfers completed
      expect(await mockUSDT.balanceOf(recipient.address)).to.equal(TRANSFER_AMOUNT * 2n);
    });
  });

  describe('Timestamp-Based Replay Prevention', function () {
    it('should reject authorization that is not yet valid', async function () {
      const currentTime = await getCurrentTimestamp();
      const nonce = generateNonce();

      const { domain, types, message } = await createTransferAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime + 3600, // Valid from 1 hour in the future
        currentTime + 7200, // Valid until 2 hours in the future
        nonce
      );

      const signature = await sender.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await expect(
        paymentRouter.connect(relayer).settleWithAuthorization(
          sender.address,
          recipient.address,
          TRANSFER_AMOUNT,
          currentTime + 3600,
          currentTime + 7200,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWith('Authorization not yet valid');
    });

    it('should reject expired authorization', async function () {
      const currentTime = await getCurrentTimestamp();
      const nonce = generateNonce();

      const { domain, types, message } = await createTransferAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 7200, // Valid from 2 hours ago
        currentTime - 3600, // Expired 1 hour ago
        nonce
      );

      const signature = await sender.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await expect(
        paymentRouter.connect(relayer).settleWithAuthorization(
          sender.address,
          recipient.address,
          TRANSFER_AMOUNT,
          currentTime - 7200,
          currentTime - 3600,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWith('Authorization expired');
    });
  });

  describe('Signature Manipulation Prevention', function () {
    it('should reject authorization with modified amount', async function () {
      const currentTime = await getCurrentTimestamp();
      const nonce = generateNonce();

      const { domain, types, message } = await createTransferAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce
      );

      const signature = await sender.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // Try to use signature with different amount
      const modifiedAmount = TRANSFER_AMOUNT * 2n;

      await expect(
        paymentRouter.connect(relayer).settleWithAuthorization(
          sender.address,
          recipient.address,
          modifiedAmount, // Modified!
          currentTime - 60,
          currentTime + 3600,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWith('Invalid signature');
    });

    it('should reject authorization with modified recipient', async function () {
      const currentTime = await getCurrentTimestamp();
      const nonce = generateNonce();

      const { domain, types, message } = await createTransferAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce
      );

      const signature = await sender.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // Try to redirect funds to relayer instead
      await expect(
        paymentRouter.connect(relayer).settleWithAuthorization(
          sender.address,
          relayer.address, // Modified recipient!
          TRANSFER_AMOUNT,
          currentTime - 60,
          currentTime + 3600,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWith('Invalid signature');
    });

    it('should reject authorization signed by wrong address', async function () {
      const currentTime = await getCurrentTimestamp();
      const nonce = generateNonce();

      const { domain, types, message } = await createTransferAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce
      );

      // Sign with relayer instead of sender
      const signature = await relayer.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      await expect(
        paymentRouter.connect(relayer).settleWithAuthorization(
          sender.address,
          recipient.address,
          TRANSFER_AMOUNT,
          currentTime - 60,
          currentTime + 3600,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWith('Invalid signature');
    });
  });

  describe('Cross-Chain Replay Prevention', function () {
    it('should include chainId in domain separator', async function () {
      // This test verifies that the domain separator includes chainId
      // which prevents replaying signatures from other chains
      
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const routerAddress = await paymentRouter.getAddress();

      // Compute expected domain separator
      const expectedDomainSeparator = ethers.TypedDataEncoder.hashDomain({
        name: DOMAIN_NAME,
        version: DOMAIN_VERSION,
        chainId: chainId,
        verifyingContract: routerAddress,
      });

      // Get actual domain separator from contract
      const actualDomainSeparator = await paymentRouter.DOMAIN_SEPARATOR();

      expect(actualDomainSeparator).to.equal(expectedDomainSeparator);
    });
  });

  describe('Nonce State Verification', function () {
    it('should correctly report nonce usage status', async function () {
      const currentTime = await getCurrentTimestamp();
      const nonce = generateNonce();

      // Nonce should not be used initially
      expect(await paymentRouter.isNonceUsed(sender.address, nonce)).to.be.false;

      const { domain, types, message } = await createTransferAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce
      );

      const signature = await sender.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(signature);

      // Execute transfer
      await paymentRouter.connect(relayer).settleWithAuthorization(
        sender.address,
        recipient.address,
        TRANSFER_AMOUNT,
        currentTime - 60,
        currentTime + 3600,
        nonce,
        v,
        r,
        s
      );

      // Nonce should now be marked as used
      expect(await paymentRouter.isNonceUsed(sender.address, nonce)).to.be.true;
    });
  });
});
