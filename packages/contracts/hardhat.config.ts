import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load the root `.env` file since this package is inside a monorepo
dotenv.config({ path: resolve(__dirname, "../../.env") });

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    endless: {
      url: process.env.ENDLESS_RPC_URL || "",
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: process.env.ENDLESS_CHAIN_ID ? parseInt(process.env.ENDLESS_CHAIN_ID) : undefined
    }
  }
};

export default config;
