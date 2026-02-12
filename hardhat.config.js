require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

/**
 * Hardhat configuration for deploying and testing the PaymentRouter contract.
 * Networks are read from environment variables to avoid committing secrets.
 */
const {
  ETH_RPC,
  PLASMA_RPC,
  RELAYER_PRIVATE_KEY,
} = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // Ethereum mainnet
    mainnet: {
      url: ETH_RPC || "",
      chainId: 1,
      accounts: RELAYER_PRIVATE_KEY ? [RELAYER_PRIVATE_KEY] : [],
    },
    // Plasma L1 (stablecoin-focused L1). Defaults to public RPC.
    plasma: {
      url: PLASMA_RPC || "https://rpc.plasma.to",
      chainId: 9745,
      accounts: RELAYER_PRIVATE_KEY ? [RELAYER_PRIVATE_KEY] : [],
    },
    // Arbitrum One (cheaper gas EVM L2)
    arbitrum: {
      url: ETH_RPC || "",
      chainId: 42161,
      accounts: RELAYER_PRIVATE_KEY ? [RELAYER_PRIVATE_KEY] : [],
    },
  },
};


