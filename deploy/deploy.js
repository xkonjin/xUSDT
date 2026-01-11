const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  
  // Deploy PaymentRouter or other contracts
  // const Contract = await hre.ethers.getContractFactory("ContractName");
  // const contract = await Contract.deploy();
  // await contract.waitForDeployment();
  // console.log("Contract deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
