# atlas-agent-api

Stablecoin Atlas data as an agent-payable API. Agents pay $0.001 in USDC per profile call via [x402](https://developers.circle.com/gateway/nanopayments/concepts/x402) + Circle Gateway Nanopayments (gasless, batched settlement).

## Endpoints

| Endpoint | Access | Description |
|---|---|---|
| `GET /health` | free | Health check |
| `GET /v1/stablecoins` | free | Teaser list: ticker, name, peg, issuer, badge codes |
| `GET /v1/stablecoins/{ticker}` | **paid** | Full profile: chains, badges with evidence URLs, regulatory status, verification date |

## Quick start (free mode)

```bash
npm install
cp .env.example .env
npm run dev
curl -s localhost:8080/v1/stablecoins | jq
curl -s localhost:8080/v1/stablecoins/usdc | jq
```

## Enabling payments

See `CLAUDE.md` for the phased build plan (data migration → free API → testnet payment gate → verification → mainnet + Agent Marketplace submission). Short version: set `SELLER_ADDRESS` and `PAYMENTS_ENABLED=true` in `.env`, following the current [Circle seller quickstart](https://developers.circle.com/gateway/nanopayments/quickstarts/seller).

## Data

`data/stablecoins/*.json` — one profile per stablecoin, schema in `src/types.ts`. Mirrored from [stablecoinatlas.app](https://stablecoinatlas.app). Every claim carries an `evidence_url`; every profile a `last_verified_at`.

## Disclaimer

Informational only; not financial, investment, legal, or tax advice.
