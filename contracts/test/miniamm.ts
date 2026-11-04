import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const DEADLINE = () => Math.floor(Date.now() / 1000) + 3600;

describe("PortalX MiniAMM", () => {
  async function twoPoolsFixture() {
    const [deployer, trader] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TestERC20");
    const usdc = await Token.deploy("Mock USD Coin", "mUSDC", 18, ethers.parseEther("10000000"));
    const pot = await Token.deploy("Mock POT", "mPOT", 18, ethers.parseEther("100000000"));

    const Factory = await ethers.getContractFactory("Factory");
    const factory = await Factory.deploy();

    const Router = await ethers.getContractFactory("Router");
    const router = await Router.deploy(await factory.getAddress());

    // pool A: 30 bps — 100k USDC / 1.25M POT  (1 POT = 0.08 USDC)
    await factory.createPair(await usdc.getAddress(), await pot.getAddress(), 30);
    // pool B: 10 bps — 100k USDC / 1.20M POT  (slightly different price)
    await factory.createPair(await usdc.getAddress(), await pot.getAddress(), 10);

    const pairA = await ethers.getContractAt(
      "Pair",
      await factory.getPair(await usdc.getAddress(), await pot.getAddress(), 30)
    );
    const pairB = await ethers.getContractAt(
      "Pair",
      await factory.getPair(await usdc.getAddress(), await pot.getAddress(), 10)
    );

    const liq = [
      { pair: pairA, feeBps: 30, usdcLiq: ethers.parseEther("100000"), potLiq: ethers.parseEther("1250000") },
      { pair: pairB, feeBps: 10, usdcLiq: ethers.parseEther("100000"), potLiq: ethers.parseEther("1200000") },
    ];
    for (const l of liq) {
      await usdc.approve(await router.getAddress(), l.usdcLiq);
      await pot.approve(await router.getAddress(), l.potLiq);
      await router.addLiquidity(
        await usdc.getAddress(),
        await pot.getAddress(),
        l.feeBps,
        l.usdcLiq,
        l.potLiq,
        0,
        0,
        deployer.address,
        DEADLINE()
      );
    }

    return { deployer, trader, usdc, pot, factory, router, pairA, pairB };
  }

  it("creates two fee-tiered venues for the same token pair", async () => {
    const { factory, pairA, pairB } = await loadFixture(twoPoolsFixture);
    expect(await factory.allPairsLength()).to.equal(2);
    expect(await pairA.feeBps()).to.equal(30);
    expect(await pairB.feeBps()).to.equal(10);
  });

  it("mints LP shares on first addLiquidity and locks minimum liquidity", async () => {
    const { pairA, deployer } = await loadFixture(twoPoolsFixture);
    expect(await pairA.balanceOf(deployer.address)).to.be.gt(0);
    expect(await pairA.totalSupply()).to.equal(
      (await pairA.balanceOf(deployer.address)) + (await pairA.MINIMUM_LIQUIDITY())
    );
  });

  it("executes a swap matching the fee-tiered quote formula", async () => {
    const { pairA, usdc, pot, router, trader } = await loadFixture(twoPoolsFixture);
    const [r0, r1] = await pairA.getReserves();
    const token0: string = await pairA.token0();
    const usdcIsToken0 = token0.toLowerCase() === (await usdc.getAddress()).toLowerCase();
    const [reserveIn, reserveOut] = usdcIsToken0 ? [r0, r1] : [r1, r0];

    const amountIn = ethers.parseEther("1000");
    const expectedOut = await router.getAmountOut(amountIn, reserveIn, reserveOut, 30);

    await usdc.mint(trader.address, amountIn);
    await usdc.connect(trader).approve(await router.getAddress(), amountIn);
    await router
      .connect(trader)
      .swapExactTokensForTokens(
        amountIn,
        0,
        [await usdc.getAddress(), await pot.getAddress()],
        [30],
        trader.address,
        DEADLINE()
      );

    expect(await pot.balanceOf(trader.address)).to.equal(expectedOut);
  });

  it("lower fee tier gives strictly better output on identical reserves (the aggregation payoff)", async () => {
    const { router } = await loadFixture(twoPoolsFixture);
    const amountIn = ethers.parseEther("1000");
    const reserveIn = ethers.parseEther("100000");
    const reserveOut = ethers.parseEther("1250000");
    const out30 = await router.getAmountOut(amountIn, reserveIn, reserveOut, 30);
    const out10 = await router.getAmountOut(amountIn, reserveIn, reserveOut, 10);
    expect(out10).to.be.gt(out30);
  });

  it("the two venues quote different outputs for the same input (routing has a real choice)", async () => {
    const { pairA, pairB, usdc, pot, router } = await loadFixture(twoPoolsFixture);
    const amountIn = ethers.parseEther("1000");

    const quoteOut = async (pair: typeof pairA, feeBps: number) => {
      const [r0, r1] = await pair.getReserves();
      const token0: string = await pair.token0();
      const usdcIsToken0 = token0.toLowerCase() === (await usdc.getAddress()).toLowerCase();
      const [reserveIn, reserveOut] = usdcIsToken0 ? [r0, r1] : [r1, r0];
      return router.getAmountOut(amountIn, reserveIn, reserveOut, feeBps);
    };

    const outA = await quoteOut(pairA, 30);
    const outB = await quoteOut(pairB, 10);
    expect(outA).to.not.equal(outB);
  });

  it("keeps k non-decreasing across a swap", async () => {
    const { pairA, usdc, pot, router, trader } = await loadFixture(twoPoolsFixture);
    const [r0Before, r1Before] = await pairA.getReserves();
    const kBefore = r0Before * r1Before;

    const amountIn = ethers.parseEther("5000");
    await usdc.mint(trader.address, amountIn);
    await usdc.connect(trader).approve(await router.getAddress(), amountIn);
    await router
      .connect(trader)
      .swapExactTokensForTokens(
        amountIn,
        0,
        [await usdc.getAddress(), await pot.getAddress()],
        [30],
        trader.address,
        DEADLINE()
      );

    const [r0After, r1After] = await pairA.getReserves();
    expect(r0After * r1After).to.be.gte(kBefore);
  });

  it("reverts when min-out is not met", async () => {
    const { usdc, pot, router, trader } = await loadFixture(twoPoolsFixture);
    const amountIn = ethers.parseEther("100");
    await usdc.mint(trader.address, amountIn);
    await usdc.connect(trader).approve(await router.getAddress(), amountIn);
    await expect(
      router
        .connect(trader)
        .swapExactTokensForTokens(
          amountIn,
          ethers.parseEther("999999"),
          [await usdc.getAddress(), await pot.getAddress()],
          [30],
          trader.address,
          DEADLINE()
        )
    ).to.be.revertedWith("INSUFFICIENT_OUTPUT_AMOUNT");
    expect(await pot.balanceOf(trader.address)).to.equal(0);
  });
});
