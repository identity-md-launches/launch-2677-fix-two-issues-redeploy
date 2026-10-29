# 🐹 SqueekBlockNFT

**On-chain block data cards for SqueekChain.** Fully on-chain SVG NFTs — each card records round, work, and rarity from the hamster's journey. Built on Sepolia testnet.

[![Vercel](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel)](https://squeek-nft.vercel.app)
[![Sepolia](https://img.shields.io/badge/network-Sepolia%20testnet-orange)](https://sepolia.etherscan.io/address/0x531497ddc70d634342020b1111C8b1A92873e669)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## What is this?

SqueekBlockNFT lets you mint block data cards — NFTs that record the state of a SqueekChain block. Each card shows:

- **Round** — which settlement round the block belongs to
- **Work** — total work units recorded for that block
- **Rarity** — based on block number (Legendary #1-10, Epic #11-100, Rare #101-1000, Milestone every 1000th, Notable every 100th)

All art is generated **fully on-chain** via SVG. No IPFS, no external hosting.

---

## Rarity Tiers

| Tier | Blocks | Color |
|------|--------|-------|
| **Legendary** | #1 – #10 | 🟠 Amber |
| **Epic** | #11 – #100 | 🟣 Purple |
| **Rare** | #101 – #1,000 | 🔵 Blue |
| **Milestone** | Every 1,000th | 🟢 Green |
| **Notable** | Every 100th | 🟢 Green |
| **Common** | Everything else | ⚪ Grey |

---

## Tech Stack

- **[Astro 7](https://astro.build)** — static & SSR framework
- **[Tailwind CSS v4](https://tailwindcss.com)** — utility-first CSS
- **[ethers.js v6](https://ethers.org)** — Ethereum interaction
- **[Vercel](https://vercel.com)** — deployment & hosting

---

## Getting Started

```bash
# Clone
git clone https://github.com/claysnguyen/squeek-nft.git
cd squeek-nft

# Install
npm install

# Run dev server
npm run dev

# Build
npm run build
```

The dev server runs at `http://localhost:4321`.

---

## Contract

Deployed on **Sepolia testnet**:

[`0x531497ddc70d634342020b1111C8b1A92873e669`](https://sepolia.etherscan.io/address/0x531497ddc70d634342020b1111C8b1A92873e669)

- Max supply: 10,000
- Mint free (only pay gas)
- Blocks must be mined before minting
- No duplicate mints

---

## How to Mint

1. Switch to **Sepolia testnet** in your wallet (site auto-switches)
2. Get free Sepolia ETH from [sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de/)
3. Pick a block number (must be ≤ current chain height)
4. Click Mint & confirm the transaction

---

## Disclaimer

This is a **community project**. We are not affiliated with SqueekChain. This is not financial advice. Minting is free — you only pay Sepolia gas.

---

## License

MIT — see [LICENSE](LICENSE) for details.