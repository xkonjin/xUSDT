const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrillionaireToys", function () {
  it("config, price growth, mint and leader", async () => {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TrillionaireToys");
    const nft = await Factory.deploy();
    await nft.waitForDeployment();

    // configure toy #1: min 0.01, max 100, r=1.15
    await expect(nft.configureToy(1, 10_000, 100_000_000, 1_150_000, "ipfs://toy1/")).to.emit(nft, "ToyConfigured");

    const p0 = await nft.currentPrice(1);
    expect(p0).to.equal(10_000);

    // mint a few and expect price to rise (capped at max)
    await expect(nft.mintTo(alice.address, 1, p0, Math.floor(Date.now()/1000)+600, "0x"))
      .to.emit(nft, "Minted");

    const p1 = await nft.currentPrice(1);
    expect(p1).to.be.gt(p0);

    await expect(nft.mintTo(bob.address, 1, p1, Math.floor(Date.now()/1000)+600, "0x"))
      .to.emit(nft, "Minted");

    const p2 = await nft.currentPrice(1);
    expect(p2).to.be.gt(p1);

    // leader should be last minter with highest price
    const leader = await nft.getLeader(1);
    expect(leader.owner_).to.equal(bob.address);
    expect(leader.price_).to.equal(p1); // price paid by bob
  });
});
