import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Hypersep testnet deployment:
 *  1. Mock USDC + Mock POT (open-faucet test tokens)
 *  2. MiniAMM Factory + Router
 *  3. Two USDC/POT pools with different fees (30 bps and 10 bps) and different
 *     reserve ratios, so the aggregator has two real venues to compare
 *  4. HypersepBridge with the deployer as testnet relayer, funded with
 *     destination-side liquidity
 *  5. Writes addresses + tx hashes into web/lib/engine/deployments.json
 *
 * Usage: npx hardhat run scripts/deploy.ts --network portaldot
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  console.log(`Network: ${network.name} (chainId ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);

  const txHashes: Record<string, string> = {};

  // 1. Tokens
  const Token = await ethers.getContractFactory("TestERC20");
  const usdc = await Token.deploy("Mock USD Coin", "mUSDC", 18, ethers.parseEther("10000000"));
  await usdc.waitForDeployment();
  txHashes.usdcDeploy = usdc.deploymentTransaction()!.hash;

  const pot = await Token.deploy("Mock POT", "mPOT", 18, ethers.parseEther("100000000"));
  await pot.waitForDeployment();
  txHashes.potDeploy = pot.deploymentTransaction()!.hash;

  // 2. AMM
  const Factory = await ethers.getContractFactory("Factory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  txHashes.factoryDeploy = factory.deploymentTransaction()!.hash;

  const Router = await ethers.getContractFactory("Router");
  const router = await Router.deploy(await factory.getAddress());
  await router.waitForDeployment();
  txHashes.routerDeploy = router.deploymentTransaction()!.hash;

  // 3. Pools: same tokens, different fees + different price ratios
  const pools = [
    { feeBps: 30, usdcLiq: ethers.parseEther("100000"), potLiq: ethers.parseEther("1250000") }, // 1 POT = 0.08 USDC
    { feeBps: 10, usdcLiq: ethers.parseEther("80000"), potLiq: ethers.parseEther("920000") },   // 1 POT ≈ 0.087 USDC
  ];
  const pairAddresses: Record<string, string> = {};

  for (const p of pools) {
    const createTx = await factory.createPair(await usdc.getAddress(), await pot.getAddress(), p.feeBps);
    await createTx.wait();
    txHashes[`createPair${p.feeBps}`] = createTx.hash;

    const pairAddr: string = await factory.getPair(await usdc.getAddress(), await pot.getAddress(), p.feeBps);
    pairAddresses[`USDC/POT@${p.feeBps}`] = pairAddr;

    await (await usdc.approve(await router.getAddress(), p.usdcLiq)).wait();
    await (await pot.approve(await router.getAddress(), p.potLiq)).wait();
    const addTx = await router.addLiquidity(
      await usdc.getAddress(),
      await pot.getAddress(),
      p.feeBps,
      p.usdcLiq,
      p.potLiq,
      0,
      0,
      deployer.address,
      Math.floor(Date.now() / 1000) + 3600
    );
    await addTx.wait();
    txHashes[`addLiquidity${p.feeBps}`] = addTx.hash;
    console.log(`Pool fee ${p.feeBps}bps: ${pairAddr}`);
  }

  // 4. Bridge (testnet relayer = deployer unless RELAYER_ADDRESS is set)
  const relayerAddress = process.env.RELAYER_ADDRESS || deployer.address;
  const Bridge = await ethers.getContractFactory("HypersepBridge");
  const bridge = await Bridge.deploy(relayerAddress);
  await bridge.waitForDeployment();
  txHashes.bridgeDeploy = bridge.deploymentTransaction()!.hash;

  await (await bridge.setSupportedToken(await usdc.getAddress(), true)).wait();
  await (await bridge.setSupportedToken(await pot.getAddress(), true)).wait();

  // destination-side liquidity so releases succeed immediately
  await (await usdc.mint(await bridge.getAddress(), ethers.parseEther("500000"))).wait();
  await (await pot.mint(await bridge.getAddress(), ethers.parseEther("6250000"))).wait();
  console.log(`Bridge: ${await bridge.getAddress()} (relayer ${relayerAddress})`);

  // 5. Persist for the quote engine + frontend execution
  const deploymentsPath = path.join(__dirname, "..", "..", "web", "lib", "engine", "deployments.json");
  let deployments: Record<string, any> = {};
  try {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  } catch {
    deployments = {};
  }
  deployments[String(chainId)] = {
    network: network.name,
    deployedAt: new Date().toISOString(),
    factory: await factory.getAddress(),
    router: await router.getAddress(),
    bridge: await bridge.getAddress(),
    relayer: relayerAddress,
    tokens: { mUSDC: await usdc.getAddress(), mPOT: await pot.getAddress() },
    pairs: pairAddresses,
    txHashes,
  };
  fs.mkdirSync(path.dirname(deploymentsPath), { recursive: true });
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2) + "\n");

  console.log("\n=== Deployment summary ===");
  console.log(JSON.stringify(deployments[String(chainId)], null, 2));
  console.log(`\nWritten to ${deploymentsPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
