# PortalX — Cross-Chain Liquidity Aggregator

> Discover, compare, and execute the best swap routes across **Portaldot V3** and external EVM chains — one quote instead of manually bridging, switching networks, and hunting pools.

**Portaldot Hacker House · Track: Multi-Chain & Cross-Chain Infra**

---

## The problem

A user holding USDC on Ethereum who wants POT on Portaldot must pick a bridge, pay its fees blindly, switch networks in their wallet, then find a pool with decent depth — with no way to compare total cost, slippage, or settlement time before committing.

## What PortalX does

PortalX queries every liquidity venue it knows — AMM pools on each chain plus bridge paths between chains — and returns **ranked routes with a full cost breakdown**: output amount, fees, gas, price impact, and estimated settlement time. The user sees the trade-offs and picks; the protocol handles the path.

## Architecture

```
                       ┌──────────────────────────────┐
                       │        PortalX DApp          │
                       │  Next.js · swap form · ranked│
                       │  route cards · tx tracking   │
                       └──────────────┬───────────────┘
                                      │ GET /api/quote
                       ┌──────────────▼───────────────┐
                       │       Quote & Route Engine   │
                       │  graph.ts    — path finder   │
                       │  scoring.ts  — multi-criteria│
                       │  quote.ts    — orchestration │
                       └──────────────┬───────────────┘
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
   │  AMM Adapter    │    │  AMM Adapter    │    │  Bridge Adapter │
   │  Portaldot pool │    │  Portaldot pool │    │  Sepolia ←→     │
   │  fee 30 bps     │    │  fee 10 bps     │    │  Portaldot      │
   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
            ▼                      ▼                      ▼
   ┌─────────────────────────────────────────┐   ┌──────────────────┐
   │  MiniAMM contracts (Portaldot V3 testnet│   │  Bridge / msg    │
   │  chainId 420420777): Factory · Pair ·   │   │  layer (simulated│
   │  Router · TestERC20 (mUSDC, mPOT)       │   │  adapter today)  │
   └─────────────────────────────────────────┘   └──────────────────┘
```

**Core abstraction — the Venue Adapter.** Every liquidity source implements one interface (`getQuote(tokenIn, tokenOut, amountIn) → Step | null`). Adding a chain, DEX, or bridge is adding one adapter file; the optimizer needs no changes.

**Route optimizer.** Tokens are nodes, quoted venue steps are edges. The engine quotes each feasible edge concurrently, enumerates simple paths (≤3 steps, ≤1 bridge, ≤2 swaps), then scores:

```
score = outputValue − gasCost − priceImpactCost − timePenalty − venueRiskPenalty
```

It returns the top 3 with labels: **Best overall / Cheapest / Fastest**.

## Repository layout

```
portalx/
├── contracts/            # Hardhat — Solidity 0.8.24
│   ├── contracts/
│   │   ├── TestERC20.sol         # mock USDC / POT with testnet faucet
│   │   └── amm/
│   │       ├── Pair.sol          # x*y=k pool, configurable fee, PX-LP shares
│   │       ├── Factory.sol       # fee-tiered pair registry (venue discovery)
│   │       └── Router.sol        # addLiquidity / swaps / on-chain quotes
│   ├── scripts/deploy.ts         # deploys + seeds 2 venues, writes deployments.json
│   └── test/miniamm.ts           # unit tests (quotes, fees, k-invariant, slippage)
└── web/                  # Next.js 15 — DApp + quote engine
    ├── app/                        # UI + /api/quote endpoint
    └── lib/engine/                 # adapters · graph · scoring · registry
```

## Getting started

```bash
# 1. Contracts
cd contracts
npm install
npx hardhat test                       # unit tests
cp .env.example .env                   # add TESTNET private key
npx hardhat run scripts/deploy.ts --network portaldot
npx hardhat run scripts/deploy.ts --network sepolia

# 2. Web + engine
cd ../web
npm install
npm run dev                            # http://localhost:3000
```

Deployment writes contract addresses and transaction hashes to
`web/lib/engine/deployments.json`, which the quote engine reads automatically.

## API

`GET /api/quote?fromChain=11155111&fromToken=mUSDC&toChain=420420777&toToken=mPOT&amountIn=100`

```json
{
  "routes": [
    {
      "labels": ["Best overall", "Fastest"],
      "amountOut": "1234500000000000000000",
      "totalFeeUsd": 1.30, "totalGasUsd": 0.25, "totalEtaSeconds": 312,
      "steps": [ { "venueId": "simbridge-sepolia-portaldot", "kind": "bridge", "...": "..." },
                 { "venueId": "miniamm-420420777-10bps", "kind": "amm", "...": "..." } ]
    }
  ],
  "warnings": [],
  "priceSource": "mock testnet oracle (static prices) — labeled in UI"
}
```

## Portaldot V3 testnet

| | |
|---|---|
| EVM RPC | `https://test-evm-rpc-v3.portaldot.dev` |
| Native RPC | `wss://test-node-v3.portaldot.dev` |
| Chain ID (EVM) | `420420777` |
| Node explorer | https://node-console.portaldot.dev/ |

## Why Portaldot is essential

PortalX's route graph is chain-agnostic, but its **settlement hub is Portaldot**: WASM/EVM compatibility lets the same aggregation logic price both Solidity and ink! venues, Portaldot's cross-chain layer is the messaging fabric the bridge adapters target, and low fees make multi-hop routes economically viable where they wouldn't be on L1 Ethereum.

## Honest scope notes

- Testnet has no organic liquidity; pools are deployed and seeded by the project (real contracts, real transactions, verifiable addresses/hashes).
- The bridge adapter is **clearly labeled simulated** pending Portaldot team confirmation of iBridge testnet API access; swapping in a real bridge touches only `lib/engine/registry.ts`.
- Token prices come from a static mock oracle (labeled in the UI). Mainnet design calls for an on-chain oracle.

## License

MIT
