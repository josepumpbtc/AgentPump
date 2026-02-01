const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AgentPumpFactory to Base...");

  const AgentPumpFactory = await hre.ethers.getContractFactory("AgentPumpFactory");
  const factory = await AgentPumpFactory.deploy();

  await factory.waitForDeployment();

  console.log(
    `✅ AgentPumpFactory deployed to: ${await factory.getAddress()}`
  );
  
  // Verify?
  // await hre.run("verify:verify", { address: await factory.getAddress() });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
