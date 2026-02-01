const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying AgentPumpFactory to Base...");

  // Get signer address from environment variable
  const signerAddress = process.env.SIGNER_ADDRESS;
  if (!signerAddress) {
    throw new Error("SIGNER_ADDRESS environment variable is required");
  }

  // Get Uniswap V2 Router address from environment variable
  // Base mainnet: 0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24 (Uniswap V2)
  // Base Sepolia: Use testnet router address
  const uniswapRouter = process.env.UNISWAP_V2_ROUTER;
  if (!uniswapRouter) {
    throw new Error("UNISWAP_V2_ROUTER environment variable is required");
  }

  console.log(`Using signer address: ${signerAddress}`);
  console.log(`Using Uniswap V2 Router: ${uniswapRouter}`);

  const AgentPumpFactory = await hre.ethers.getContractFactory("AgentPumpFactory");
  const factory = await AgentPumpFactory.deploy(signerAddress, uniswapRouter);

  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`✅ AgentPumpFactory deployed to: ${factoryAddress}`);
  console.log(`   Signer address: ${signerAddress}`);
  console.log(`   Uniswap V2 Router: ${uniswapRouter}`);
  
  // Verify on block explorer
  if (process.env.VERIFY === "true") {
    console.log("Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", { 
        address: factoryAddress,
        constructorArguments: [signerAddress, uniswapRouter]
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.error("Verification failed:", error.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
