import { parseAbi } from "viem";

export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

export const ROUTER_ABI = parseAbi([
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, uint16[] fees, address to, uint256 deadline) returns (uint256[])",
  "function getAmountsOut(uint256 amountIn, address[] path, uint16[] fees) view returns (uint256[])",
]);

export const BRIDGE_ABI = parseAbi([
  "function deposit(address token, uint256 amount, uint256 destChainId, address recipient) returns (bytes32)",
  "function release(bytes32 depositId, address token, uint256 amount, address recipient)",
  "function released(bytes32 depositId) view returns (bool)",
  "event Deposited(bytes32 indexed depositId, address indexed token, uint256 amount, uint256 indexed destChainId, address sender, address recipient)",
  "event Released(bytes32 indexed depositId, address indexed token, uint256 amount, address indexed recipient)",
]);

export const PAIR_ABI = parseAbi([
  "function getReserves() view returns (uint112, uint112, uint32)",
  "function token0() view returns (address)",
  "function feeBps() view returns (uint16)",
]);
