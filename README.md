# Monad AI Agent Marketplace MVP

Hackathon MVP for ownable, transferable, and monetizable AI agents on a Monad-compatible EVM chain.

Agents are on-chain assets. Execution stays off-chain. One user can mint and sell an agent, the next owner can price usage, and another user can pay for a single execution entitlement that the backend verifies and settles on-chain.

## Repo Layout

- [`contracts`](/C:/Users/ramaz/OneDrive/Masaüstü/blitz_izmir/contracts): Solidity contracts and Foundry tests
- [`backend`](/C:/Users/ramaz/OneDrive/Masaüstü/blitz_izmir/backend): Express + TypeScript execution backend
- [`frontend`](/C:/Users/ramaz/OneDrive/Masaüstü/blitz_izmir/frontend): Next.js marketplace UI

## Protocol Mapping

Allowed narrative:
- ERC-721-style ownership
- x402-inspired pay-per-request flow
- ERC-8004-inspired trust counters
- ERC-8183-inspired agent commerce lifecycle

Explicit non-claims:
- not full x402 compliance
- not full ERC-8004 compliance
- not full ERC-8183 compliance

## What Is Implemented

- `AgentNFT` contract for agent ownership, metadata references, active status, versioning, maintainer, and trust counters
- `AgentMarketplace` contract for listing, buying, usage pricing, one-shot entitlements, and backend finalization
- Foundry test suite covering minting, listing, purchase flow, entitlement creation, authorization, and counter updates
- Express backend with:
  - `GET /agents`
  - `GET /agents/:tokenId`
  - `POST /execute`
- Wallet-signature verification for execution requests
- Three demo agent archetypes:
  - Research Agent
  - Marketing Copy Agent
  - Summarizer Agent
- Next.js frontend with marketplace, agent detail page, owner actions, pay-for-usage flow, and backend execution flow

## Requirements

- Node.js 22+
- npm 10+
- Foundry
- a local Monad-compatible RPC or Monad testnet RPC
- one funded finalizer wallet private key for backend settlement

Windows note:
- Foundry installation is easiest through WSL
- the contracts already compile and test successfully with `forge build` and `forge test`

## Contract Verification Status

Verified in this repo:

```bash
cd contracts
forge build
forge test
```

Result at implementation time:
- `forge build` passed
- `forge test` passed with 10/10 tests

## Environment Variables

### Backend

Copy [`backend/.env.example`](/C:/Users/ramaz/OneDrive/Masaüstü/blitz_izmir/backend/.env.example) to `backend/.env` and set:

```env
PORT=3001
CORS_ORIGIN=http://localhost:3000
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
DEPLOYER_PRIVATE_KEY=0x...
AGENT_NFT_ADDRESS=0x...
AGENT_MARKETPLACE_ADDRESS=0x...
FINALIZER_PRIVATE_KEY=0x...
AGENT_TOKEN_IDS=1,2,3
EXECUTE_MESSAGE_TTL_SECONDS=600
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Notes:
- if `OPENAI_API_KEY` is empty, the backend returns deterministic demo fallback output
- `FINALIZER_PRIVATE_KEY` must correspond to the address set as marketplace finalizer
- `AGENT_TOKEN_IDS` should match the minted seeded agents

### Frontend

Copy [`frontend/.env.example`](/C:/Users/ramaz/OneDrive/Masaüstü/blitz_izmir/frontend/.env.example) to `frontend/.env.local` and set:

```env
NEXT_PUBLIC_APP_NAME=Monad Agent Marketplace
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_AGENT_NFT_ADDRESS=0x...
NEXT_PUBLIC_AGENT_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## Contract Deployment

Preferred path from this repo:

```bash
cd backend
npm run deploy:contracts
```

The deploy script uses the existing Foundry build artifacts in `contracts/out`, deploys `AgentNFT`, deploys `AgentMarketplace`, calls:

1. `setAuthorizedUsageRecorder(marketplaceAddress)` on `AgentNFT`
2. `setFinalizer(finalizerAddress)` on `AgentMarketplace`

It then writes deployment records to:

- `contracts/deployments/latest.json`
- `contracts/deployments/<chainId>.json`

It also prints the exact `backend/.env` and `frontend/.env.local` values to use after deployment.

Required env for the deploy script:

```env
RPC_URL=http://127.0.0.1:8545
DEPLOYER_PRIVATE_KEY=0x...
FINALIZER_PRIVATE_KEY=0x...
```

Optional deploy overrides:

```env
DEPLOY_RPC_URL=http://127.0.0.1:8545
AGENT_NFT_NAME=Monad Agents
AGENT_NFT_SYMBOL=AGENT
```

Fallback manual path if you prefer Foundry CLI:

```bash
cd contracts
forge create src/AgentNFT.sol:AgentNFT \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args "Monad Agents" "AGENT"

forge create src/AgentMarketplace.sol:AgentMarketplace \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args $AGENT_NFT_ADDRESS
```

## Seeding Demo Agents

Mint three agents whose `agentKey` values match the backend archetypes:

- `research-agent`
- `marketing-copy-agent`
- `summarizer-agent`

Suggested metadata shape:

```json
{
  "name": "Research Agent",
  "description": "Turns a prompt into a concise research brief.",
  "category": "Research",
  "image": "https://...",
  "promptHint": "Analyze the current market for AI-native commerce protocols."
}
```

Recommended seeded setup:
- token `1`: Research Agent
- token `2`: Marketing Copy Agent
- token `3`: Summarizer Agent

Then update:
- `backend/.env` with `AGENT_TOKEN_IDS=1,2,3`
- `frontend/.env.local` with deployed addresses

## Running The Stack

### 1. Contracts

Run your local chain or point at Monad testnet:

```bash
anvil
```

or use a Monad-compatible RPC URL in env files.

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

The backend will start on `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:3000`.

## Execution Flow

The frontend uses a strict two-step usage flow:

1. user pays `payForUsage` on-chain
2. frontend extracts `entitlementId` from `UsageEntitlementPurchased`
3. user signs an execution message
4. frontend sends signed payload to backend
5. backend verifies signature and entitlement
6. backend runs the selected off-chain agent
7. backend calls `finalizeUsage`
8. frontend refreshes counters and shows output

Signed message fields:
- `buyerAddress`
- `tokenId`
- `entitlementId`
- `prompt`
- `timestamp`
- `chainId`

## Demo Script

Use three wallets:
- Wallet A: creator and initial seller
- Wallet B: buyer and new owner
- Wallet C: end user paying for execution

Live demo flow:

1. Wallet A mints `Research Agent` with `agentKey = research-agent`
2. Wallet A approves the marketplace for that token
3. Wallet A lists the agent for sale
4. Frontend marketplace shows the listed agent
5. Wallet B buys the agent
6. Frontend detail page shows Wallet B as new owner
7. Wallet B sets a usage price
8. Wallet C opens the detail page and clicks `Pay For Usage`
9. Wallet C signs the execution request
10. Backend verifies entitlement and signature
11. Backend executes the agent off-chain
12. Backend finalizes usage on-chain
13. Frontend shows output plus updated trust counters

## Known Limitations

- no refunds
- no retries or queueing
- no subscription or rental model
- no royalties or protocol fees
- no indexing layer beyond direct chain reads
- no decentralized inference
- no production-grade auth or observability
- deploy helper covers deployment and initial contract wiring, but seeding is still manual
- frontend currently assumes wallet extension availability through injected providers

## Why This Scope Is Correct

This MVP is intentionally narrow. It proves:
- agents can be owned and transferred on-chain
- usage rights can be sold one request at a time
- off-chain execution can respect on-chain payment rights
- trust counters can update visibly after real usage

It does not try to solve every marketplace, protocol, or AI infrastructure problem. That is the correct tradeoff for a hackathon demo.
