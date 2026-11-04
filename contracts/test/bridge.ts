import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("PortalXBridge", () => {
  async function bridgeFixture() {
    const [owner, relayer, user, recipient, stranger] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TestERC20");
    const usdc = await Token.deploy("Mock USD Coin", "mUSDC", 18, ethers.parseEther("10000000"));

    const Bridge = await ethers.getContractFactory("PortalXBridge");
    const bridge = await Bridge.deploy(relayer.address);

    await bridge.setSupportedToken(await usdc.getAddress(), true);
    // destination-side liquidity for the relayer release path
    await usdc.mint(await bridge.getAddress(), ethers.parseEther("500000"));

    return { owner, relayer, user, recipient, stranger, usdc, bridge };
  }

  async function depositedFixture() {
    const base = await bridgeFixture();
    const { user, usdc, bridge } = base;
    const amount = ethers.parseEther("1000");

    await usdc.mint(user.address, amount);
    await usdc.connect(user).approve(await bridge.getAddress(), amount);
    const tx = await bridge.connect(user).deposit(await usdc.getAddress(), amount, 11155111, user.address);
    const receipt = await tx.wait();
    const event = receipt!.logs.find((l: any) => l.fragment?.name === "Deposited");
    const depositId = event!.args[0] as string;

    return { ...base, amount, depositId };
  }

  it("deposit locks tokens and emits a Deposited event with a unique id", async () => {
    const { user, usdc, bridge, amount, depositId } = await loadFixture(depositedFixture);
    expect(depositId).to.be.a("string").and.not.equal(ethers.ZeroHash);
    expect(await usdc.balanceOf(await bridge.getAddress())).to.equal(
      ethers.parseEther("500000") + amount
    );
    expect(await usdc.balanceOf(user.address)).to.equal(0);
  });

  it("rejects deposits of unsupported tokens and same-chain transfers", async () => {
    const { user, usdc, bridge } = await loadFixture(bridgeFixture);
    const Token = await ethers.getContractFactory("TestERC20");
    const other = await Token.deploy("Other", "OTH", 18, ethers.parseEther("1"));
    await expect(
      bridge.connect(user).deposit(await other.getAddress(), 1, 11155111, user.address)
    ).to.be.revertedWith("UNSUPPORTED_TOKEN");

    await usdc.mint(user.address, 1);
    await usdc.connect(user).approve(await bridge.getAddress(), 1);
    await expect(
      bridge.connect(user).deposit(await usdc.getAddress(), 1, (await ethers.provider.getNetwork()).chainId, user.address)
    ).to.be.revertedWith("SAME_CHAIN");
  });

  it("release sends funds exactly once per depositId", async () => {
    const { relayer, recipient, usdc, bridge, amount, depositId } = await loadFixture(depositedFixture);
    await bridge.connect(relayer).release(depositId, await usdc.getAddress(), amount, recipient.address);
    expect(await usdc.balanceOf(recipient.address)).to.equal(amount);
    await expect(
      bridge.connect(relayer).release(depositId, await usdc.getAddress(), amount, recipient.address)
    ).to.be.revertedWith("ALREADY_RELEASED");
  });

  it("only the relayer can release", async () => {
    const { stranger, usdc, bridge, amount, depositId } = await loadFixture(depositedFixture);
    await expect(
      bridge.connect(stranger).release(depositId, await usdc.getAddress(), amount, stranger.address)
    ).to.be.revertedWith("NOT_RELAYER");
  });

  it("only the owner can admin", async () => {
    const { stranger, relayer, bridge } = await loadFixture(bridgeFixture);
    await expect(bridge.connect(stranger).setRelayer(stranger.address)).to.be.revertedWith("NOT_OWNER");
    await expect(bridge.connect(stranger).rescue(stranger.address, stranger.address, 1)).to.be.revertedWith(
      "NOT_OWNER"
    );
    await bridge.setRelayer(stranger.address);
    expect(await bridge.relayer()).to.equal(stranger.address);
    await expect(bridge.connect(relayer).release(ethers.ZeroHash, stranger.address, 1, stranger.address)).to.be
      .revertedWith("NOT_RELAYER");
  });
});
