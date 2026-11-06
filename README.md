<p align="center">
  <img src="public/assets/logo.png" alt="Hypersep" width="320" />
</p>

# Hypersep - Cross-Chain Liquidity Aggregator

Discover, compare, and execute the best swap routes across **Portaldot V3** and external EVM chains in one quote, instead of manually bridging, switching networks, and hunting pools.

**Portaldot Hacker House - Track: Multi-Chain & Cross-Chain Infra**

---

## The problem

A user holding USDC on Ethereum who wants POT on Portaldot must pick a bridge, pay its fees blindly, switch networks in their wallet, then find a pool with decent depth, with no way to compare total cost, slippage, or settlement time before committing.

## What Hypersep does

Hypersep queries every liquidity venue it knows (AMM pools on each chain plus bridge paths between chains) and returns **ranked routes with a full cost breakdown**: output amount, fees, gas, price impact, and estimated settlement time. The user sees the trade-offs and picks; the protocol handles the path.

The same engine is exposed two ways: a swap dashboard in the app and an MCP server at `POST /api/mcp` for agents such as Claude Code and ChatGPT.

## AI and agents

Hypersep is AI-first because the route engine is the product and the app is only one client of it. An agent is the other client, and it uses the same quote engine over MCP instead of scraping a UI.

What the agent actually does:

1. The user asks in plain language, for example: "Cheapest route for 100 mUSDC on Sepolia into mPOT on Portaldot?"
2. The agent reads the MCP tool list and calls `hypersep_quote` with the two chains, two tokens, and amount.
3. The engine quotes every venue and bridge path, scores them on output, fees, gas, price impact, time, and risk, and returns the top three routes.
4. The agent compares the routes, explains the trade-offs, and names the best path. No custom prompt engineering is needed, the tool output is already structured.
5. Execution stays with the user. The wallet signs the prepared transactions. The agent never holds a private key.

```
User -> Claude / ChatGPT -> MCP POST /api/mcp -> quote engine -> AMM + bridge venues
```

A tool call looks like this:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "hypersep_quote",
    "arguments": {
      "fromChain": "11155111",
      "fromToken": "mUSDC",
      "toChain": "420420777",
      "toToken": "mPOT",
      "amountIn": 100
    }
  }
}
```

The response is the same ranked route set the dashboard uses: labels (`Best overall`, `Cheapest`, `Fastest`), output amount, fees, gas, price impact, ETA, and the ordered venues.

The public tools are read-only and need no API key, OAuth, or database: `hypersep_quote`, `hypersep_deployments`, `hypersep_status`.

## Connect an agent

The MCP server works with any MCP client: Claude Code, Codex, Cursor, ChatGPT, or your own agent. No SDK, no plugin, no per-agent integration.

1. Copy your Hypersep MCP URL, for example `https://your-domain/api/mcp`.
2. Add it once:

```bash
claude mcp add --transport http hypersep https://your-domain/api/mcp
```

3. Ask: "Use hypersep_quote for 100 mUSDC on Sepolia into mPOT on Portaldot."

That is the whole setup. The endpoint is `POST /api/mcp` with JSON-RPC 2.0, and `GET /api/mcp` is the discovery document. One server covers Claude Code, Codex, Cursor, ChatGPT, and any other MCP client.

```json
{
  "mcpServers": {
    "hypersep": {
      "type": "http",
      "url": "https://your-domain/api/mcp"
    }
  }
}
```

## Architecture

```
                       +------------------------------+
                       |        Hypersep DApp         |
                       |  Next.js - swap form - ranked |
                       |  route cards - tx tracking   |
                       +--------------+---------------+
                                      | GET /api/quote
                       +--------------v---------------+
                       |       Quote & Route Engine    |
                       |  graph.ts    - path finder    |
                       |  scoring.ts  - multi-criteria |
                       |  quote.ts    - orchestration  |
                       +--------------+---------------+
              +-----------------------+-----------------------+
              v                       v                       v
   +-----------------+    +-----------------+    +-----------------+
   |  AMM Adapter    |    |  AMM Adapter    |    |  Bridge Adapter |
   |  Portaldot pool |    |  Portaldot pool |    |  Sepolia <->    |
   |  fee 30 bps     |    |  fee 10 bps     |    |  Portaldot      |
   +--------+--------+    +--------+--------+    +--------+--------+
            v                      v                      v
   +-----------------------------------------+   +------------------+
   |  MiniAMM contracts (Portaldot V3 testnet |   |  Bridge / msg    |
   |  chainId 420420777): Factory - Pair -   |   |  layer (simulated |
   |  Router - TestERC20 (mUSDC, mPOT)       |   |  adapter today)  |
   +-----------------------------------------+   +------------------+
```

**Core abstraction: the Venue Adapter.** Every liquidity source implements one interface (`getQuote(tokenIn, tokenOut, amountIn) -> Step | null`). Adding a chain, DEX, or bridge is adding one adapter file; the optimizer needs no changes.

**Route optimizer.** Tokens are nodes, quoted venue steps are edges. The engine quotes each feasible edge concurrently, enumerates simple paths (up to 3 steps, 1 bridge, 2 swaps), then scores:

```
score = outputValue - gasCost - priceImpactCost - timePenalty - venueRiskPenalty
```

It returns the top 3 with labels: **Best overall / Cheapest / Fastest**.

## Repository layout

```
hypersep/
├── app/                        # Next.js 15 App Router
│   ├── page.tsx                # landing page, wallet connect opens the dashboard
│   ├── docs/page.tsx           # public API docs
│   └── api/
│       ├── quote/route.ts      # GET /api/quote
│       ├── deployments/route.ts
│       ├── status/route.ts     # settlement monitor
│       ├── bridge/relay/route.ts
│       └── mcp/route.ts        # embedded MCP server (JSON-RPC 2.0)
├── components/                 # wallet button, route card, execution panel, marks
│   ├── HeroDevice.tsx          # hero iPhone Duo (3D foldable device)
│   └── iphone-duo/             # jal-co/iphone-duo component (MIT code)
├── public/
│   ├── assets/                 # logo.svg, logo.png, icon.svg, icon.png
│   ├── hypersep/               # iPhone Duo screen artwork
│   └── models/iphone-duo.glb   # Apple model, see THIRD_PARTY.md
├── hooks/useWallet.ts          # EIP-1193 injected wallet state
├── lib/
│   ├── chains.ts abis.ts execution.ts types.ts
│   └── engine/                 # server-side quote engine
│       ├── adapters/           # amm.ts, bridge.ts
│       ├── graph.ts scoring.ts quote.ts registry.ts types.ts
│       ├── demo.ts             # seeded liquidity when not deployed
│       └── deployments.json    # written by the deploy script
└── contracts/                  # Hardhat - Solidity 0.8.24
    ├── contracts/
    │   ├── TestERC20.sol       # mock USDC / POT with open testnet faucet
    │   ├── amm/
    │   │   ├── Pair.sol        # x*y=k pool, configurable fee, PX-LP shares
    │   │   ├── Factory.sol     # fee-tiered pair registry (venue discovery)
    │   │   └── Router.sol      # addLiquidity / swaps / on-chain quotes
    │   └── bridge/HypersepBridge.sol
    ├── scripts/deploy.ts       # deploys + seeds 2 venues, writes deployments.json
    └── test/                   # AMM and bridge unit tests
```

## Getting started

```bash
# 1. Web app + quote engine
npm install
cp .env.example .env.local       # optional: RPC overrides + relayer key
npm run dev                      # http://localhost:3000

# 2. Contracts (needs a testnet-funded key)
cd contracts
npm install
npx hardhat test
cp .env.example .env             # add PRIVATE_KEY funded with testnet gas
npx hardhat run scripts/deploy.ts --network portaldot
```

The deploy script writes contract addresses and transaction hashes to `lib/engine/deployments.json`, which the quote engine reads on the next build. Deploy on Sepolia too if you want both sides of the route graph live.

## Demo mode

`lib/engine/deployments.json` starts empty. Until you deploy contracts, the engine serves **clearly labeled demo liquidity** (same constant-product math, seeded reserves on both chains) so the UI and API are explorable immediately. Every quote carries `"demo": true`, the UI hides execution, and the response says contracts are not deployed. Run the deploy script and rebuild to switch to on-chain reserves.

## API

`GET /api/quote?fromChain=11155111&fromToken=mUSDC&toChain=420420777&toToken=mPOT&amountIn=100`

```json
{
  "routes": [
    {
      "labels": ["Best overall", "Fastest"],
      "amountOut": "1234500000000000000000",
      "totalFeeUsd": 1.30,
      "totalGasUsd": 0.25,
      "totalEtaSeconds": 312,
      "steps": [
        { "venueId": "simbridge-sepolia-portaldot", "kind": "bridge", "...": "..." },
        { "venueId": "miniamm-420420777-10bps", "kind": "amm", "...": "..." }
      ]
    }
  ],
  "warnings": [],
  "priceSource": "mock testnet oracle (static prices), labeled in UI",
  "demo": false
}
```

Other endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/deployments` | Contract addresses and tx hashes |
| `GET /api/status?chainId&txHash` | Settlement status for a transaction |
| `POST /api/bridge/relay` | Relayer releases bridged funds on the destination chain |
| `GET /api/mcp` | MCP discovery document |
| `POST /api/mcp` | JSON-RPC 2.0: `initialize`, `tools/list`, `tools/call`, `ping` |

MCP tools: `hypersep_quote`, `hypersep_deployments`, `hypersep_status`. They are read-only today; execution planning is the next tool.

```bash
claude mcp add --transport http hypersep http://localhost:3000/api/mcp
```

See `MCP_LAYER.md` for the full agent integration blueprint.

## Deploy

The app is a standard Next.js 15 project and deploys to Vercel with no config.

1. If contracts are live, commit the generated `lib/engine/deployments.json` first. It is bundled at build time.
2. Import the repo at Vercel, framework preset **Next.js**, build command `npm run build`.
3. Set optional env vars from `.env.example`. Only the `RELAYER_PRIVATE_KEY` is secret.
4. Deploy.

For any other host, `npm run build` then `npm start` works.

## Portaldot V3 testnet

| | |
|---|---|
| EVM RPC | `https://test-evm-rpc-v3.portaldot.dev` |
| Native RPC | `wss://test-node-v3.portaldot.dev` |
| Chain ID (EVM) | `420420777` |
| Node explorer | https://node-console.portaldot.dev/ |

## Contract details

Status: **not deployed yet**. The deploy script and contracts are ready; the deployer needs roughly 200 tPOT on Portaldot for the first contract's gas and storage deposit hold.

| Item | Value |
|---|---|
| Network | Portaldot V3 Testnet |
| Chain ID | `420420777` |
| EVM RPC | `https://test-evm-rpc-v3.portaldot.dev` |
| Node RPC | `wss://test-node-v3.portaldot.dev` |
| Explorer | https://node-console.portaldot.dev/ |
| Deployer EVM | `0x421D297A9d9ba5112Ede43E96F83a54C4e4AafDb` |
| Deployer native | `5DZPgRPx9vvXf2FuSsm3WzVXBwhQkTSaCnP3yWT7s2inqpyr` |
| Deployment config | `lib/engine/deployments.json` |

Contracts deployed by `contracts/scripts/deploy.ts`:

| Contract | Purpose |
|---|---|
| `TestERC20` mUSDC | Mock USD Coin, 18 decimals, open mint faucet |
| `TestERC20` mPOT | Mock POT, 18 decimals, open mint faucet |
| `Factory` | Fee-tiered pair registry for venue discovery |
| `Router` | `addLiquidity`, swaps, on-chain quotes |
| `Pair` 30 bps | USDC/POT constant-product pool |
| `Pair` 10 bps | USDC/POT constant-product pool |
| `HypersepBridge` | Lock and release testnet bridge, deployer as relayer |

Links:

- Contracts source: https://github.com/fozagtx/hypersep/tree/main/contracts
- Deploy script: https://github.com/fozagtx/hypersep/blob/main/contracts/scripts/deploy.ts
- Repository: https://github.com/fozagtx/hypersep

After the deploy runs, `lib/engine/deployments.json` holds the chain id, factory, router, bridge, relayer, token addresses, pair addresses, and every transaction hash. `/api/deployments` returns the same data, and the dashboard Contracts panel renders it.

## Why Portaldot is essential

Hypersep's route graph is chain-agnostic, but its **settlement hub is Portaldot**: WASM/EVM compatibility lets the same aggregation logic price both Solidity and ink! venues, Portaldot's cross-chain layer is the messaging fabric the bridge adapters target, and low fees make multi-hop routes economically viable where they would not be on L1 Ethereum.

## Honest scope notes

- Demo mode uses seeded reserves, not organic liquidity. Once contracts are deployed, the pools are real contracts, real transactions, and verifiable addresses and hashes.
- The bridge adapter is **clearly labeled simulated** pending Portaldot team confirmation of iBridge testnet API access. Swapping in a real bridge touches only `lib/engine/registry.ts`.
- Token prices come from a static mock oracle, labeled in the UI. Mainnet design calls for an on-chain oracle.
- The embedded `/api/mcp` server is unauthenticated and read-only. OAuth and connected-app flows are described in `MCP_LAYER.md`.

## License

MIT. See `LICENSE`. The iPhone Duo component code is MIT by jal-co. The Apple 3D model and its
textures are excluded from the MIT license; see `THIRD_PARTY.md` before redistributing.
