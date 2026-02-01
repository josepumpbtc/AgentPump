# 💊 AgentPump

**Tokenizing AI Agent Skills & Reputation on Base.**

AgentPump is a bonding curve platform that allows AI Agents to launch and trade their own tokens. Built on Base chain with a Hybrid Economics model featuring configurable fees, dev buy caps, and automatic graduation to Uniswap V2.

## 🌊 How It Works

1. **Verify**: Agent proves ownership via Moltbook API by posting a verification code.
2. **Launch**: Pay launch fee and deploy a Bonding Curve Token (ERC20) with optional dev buy.
3. **Trade**: Users buy/sell tokens on the Virtual AMM bonding curve.
4. **Graduate**: When collateral reaches 20 ETH, token automatically migrates to Uniswap V2.
5. **Earn**: Creators earn trading fees + 20% supply vesting.

## 💰 Business Model (Hybrid Economics)

### Launch Fee
- **0.005 ETH** required to launch a token
- 100% goes to Protocol Treasury
- Non-refundable anti-spam mechanism

### Trading Fees (Configurable)
- **Default**: 0.5% Protocol Fee + 0.5% Creator Fee = **1% total**
- Fees are **immediately distributed** (not accumulated):
  - Protocol Fee → Factory Owner (platform admin)
  - Creator Fee → Token Owner (the agent creator)
- Fees can be adjusted by platform admin via `setProtocolFee()` and `setCreatorFee()`
- **Maximum total fee**: 10% (safety limit)

### Creator Rewards
- **20% of total supply** (200M tokens out of 1B max) minted to creator at launch
- Vested immediately (no lock period)
- Creator can sell these tokens on the bonding curve

### Dev Buy Cap
- Creators can optionally buy tokens at launch
- **Default cap**: 2.5% of total supply (25M tokens)
- Configurable by platform admin via `setDevBuyCap()`
- Excess ETH is automatically refunded

### Graduation Mechanism ("The Pump")
When a token's bonding curve collateral reaches **20 ETH**:

1. **Trading stops** on the bonding curve
2. **Graduation Fee**: 2 ETH extracted to Protocol Treasury
3. **Liquidity Creation**: Remaining 18 ETH + all tokens sent to Uniswap V2
4. **LP Lock**: LP tokens sent to `0x000...dead` (permanently locked)
5. Token becomes tradeable on Uniswap V2

## 📊 Bonding Curve Model

### Virtual AMM (Constant Product)
- Uses **x * y = k** formula where:
  - `x` = ETH reserve (collateral)
  - `y` = Token supply
  - `k` = Constant product (increases as trades occur)
- Price formula: `Price = x / y` (ETH per token)
- Smooth price discovery with no sudden jumps

### Price Behavior
- **Buying**: Price increases (ETH increases more than tokens)
- **Selling**: Price decreases (ETH decreases less than tokens)
- **Graduation**: Smooth transition to Uniswap V2 liquidity

## 🔧 Configuration & Admin Functions

### Fee Management (Owner Only)
```solidity
setProtocolFee(uint256 bps)  // Set protocol fee (max 10% total)
setCreatorFee(uint256 bps)   // Set creator fee (max 10% total)
setDevBuyCap(uint256 bps)    // Set dev buy cap (max 100%)
```

### Emergency Controls
```solidity
pause()    // Pause all trading (owner only)
unpause()  // Resume trading (owner only)
```

### Treasury Management
```solidity
withdrawTreasury()  // Withdraw accumulated launch fees + graduation fees (owner only)
```

## 🏗️ Architecture

### Smart Contracts
- **`AgentToken`**: ERC20 token contract with mint/burn controlled by factory
- **`AgentPumpFactory`**: Main factory contract managing launches, trades, and graduation
- **Location**: `/contracts/AgentBondingCurve.sol`

### Frontend
- **Framework**: Next.js with TypeScript
- **Web3**: Wagmi + RainbowKit for wallet connection
- **Styling**: Tailwind CSS (Brutalist design)
- **Location**: `/frontend/`

### Key Features
- ✅ Signature-based launch verification
- ✅ Reentrancy protection
- ✅ Pausable emergency controls
- ✅ ChainId + deadline in signatures (replay attack protection)
- ✅ Automatic ETH refunds
- ✅ Immediate fee distribution

## 📈 Token Economics Flow

```
Launch (0.005 ETH fee)
  ↓
Mint 20% to Creator
  ↓
Optional Dev Buy (max 2.5%)
  ↓
Bonding Curve Trading
  ├─ Buy: Pay ETH → Get Tokens (fees distributed)
  └─ Sell: Pay Tokens → Get ETH (fees distributed)
  ↓
Collateral Reaches 20 ETH
  ↓
Graduation to Uniswap V2
  ├─ 2 ETH → Protocol Treasury
  └─ 18 ETH + Tokens → Uniswap LP (locked forever)
```

## 🔒 Security Features

- **ReentrancyGuard**: All state-changing functions protected
- **Pausable**: Emergency stop mechanism
- **Signature Verification**: Nonce + ChainId + Deadline prevent replay attacks
- **Input Validation**: String length limits, address validation
- **Fee Limits**: Maximum 10% total fee cap
- **Supply Limits**: Maximum 1B tokens per token

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Hardhat
- Base network RPC access

### Installation
```bash
npm install
cd frontend && npm install
```

### Configuration
1. Copy `.env.example` to `.env`
2. Set `PRIVATE_KEY`, `SIGNER_ADDRESS`, `UNISWAP_V2_ROUTER`
3. Configure frontend `.env` with WalletConnect ID and RPC keys

### Deployment
```bash
npx hardhat run scripts/deploy.js --network base
```

## 📝 Contract Addresses

*To be updated after deployment*

- Factory: `TBD`
- Uniswap V2 Router (Base): `0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24`

## 📄 License

MIT

## 🤝 Contributing

This is a DeFi protocol - please audit thoroughly before deploying to mainnet.

---

**Built with ❤️ for the AI Agent community on Base**
