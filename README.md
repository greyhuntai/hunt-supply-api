# HUNT Token Supply API for CoinGecko

A simple REST API that serves **total supply** and **circulating supply** for the HUNT token on Base chain. Built to meet CoinGecko's API endpoint requirements for market cap display.

## Endpoints

| Endpoint | Returns | Example |
|---|---|---|
| GET /total-supply | Total supply as plain number | 100000000.0 |
| GET /circulating-supply | Circulating supply as plain number | 19500000.0 |
| GET /supply | Full JSON breakdown | { totalSupply, circulatingSupply, ... } |

## How It Works

1. Reads totalSupply() from the HUNT ERC-20 contract on Base chain
2. Reads balanceOf() for all non-circulating wallets (team, vesting, foundation, investor, airdrop, deployer)
3. Circulating Supply = Total Supply - Non-Circulating Balances
4. Caches results for 5 minutes

## Quick Start

\`\`\`bash
npm install
cp .env.example .env
npm start
\`\`\`

## Deploy to Render

1. Fork/push this repo to GitHub
2. Go to render.com > New > Web Service
3. Connect this repo
4. Build Command: npm install
5. Start Command: npm start
6. Add env var: RPC_URL=https://mainnet.base.org

## After Deployment

Submit your URLs on the CoinGecko form:
- Total Supply: https://yourdomain.com/total-supply
- Circulating Supply: https://yourdomain.com/circulating-supply# hunt-supply-api
CoinGecko Total &amp; Circulating Supply API for HUNT token on Base chain
