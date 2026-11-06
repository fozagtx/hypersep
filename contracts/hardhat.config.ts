import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    portaldot: {
      url: process.env.PORTALDOT_RPC || "https://test-evm-rpc-v3.portaldot.dev",
      chainId: 420420777,
      accounts,
      // Portaldot's revive EVM uses weight-scaled gas. Transactions with a
      // normal Ethereum gas limit are rejected as invalid, so pin the limit
      // to the scale seen in accepted network transactions.
      gas: 6_000_000_000_000,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC || "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts,
    },
  },
};

export default config;
