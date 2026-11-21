import express from "express";
import type { RequestHandler } from "express";
import { getProfile, listSummaries } from "./data.js";
import { SOURCE, DISCLAIMER } from "./types.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8080);
const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === "true";
const PRICE_PER_PROFILE = process.env.PRICE_PER_PROFILE ?? "$0.001";

// ---------------------------------------------------------------------------
// Payment gate (Phase 3, testnet). With PAYMENTS_ENABLED=false the API runs
// free. Verified against @circle-fin/x402-batching@3.2.0 (installed, matches
// latest on npm) and the live seller quickstart on 2026-07-12:
//   https://developers.circle.com/gateway/nanopayments/quickstarts/seller
//
// GatewayMiddlewareConfig.facilitatorUrl defaults to MAINNET
// ("https://gateway-api.circle.com") when omitted — GATEWAY_NETWORK_ENV below
// exists specifically so this service never lands on mainnet by accident.
// ---------------------------------------------------------------------------
let paidGate: RequestHandler = (_req, _res, next) => next();

const GATEWAY_FACILITATOR_URLS = {
  testnet: "https://gateway-api-testnet.circle.com",
  mainnet: "https://gateway-api.circle.com",
} as const;

if (PAYMENTS_ENABLED) {
  const { createGatewayMiddleware } = await import(
    "@circle-fin/x402-batching/server"
  );
  const sellerAddress = process.env.SELLER_ADDRESS;
  if (!sellerAddress || !/^0x[a-fA-F0-9]{40}$/.test(sellerAddress)) {
    throw new Error("PAYMENTS_ENABLED=true requires a valid SELLER_ADDRESS");
  }
  const networkEnv = process.env.GATEWAY_NETWORK_ENV ?? "testnet";
  if (networkEnv !== "testnet" && networkEnv !== "mainnet") {
    throw new Error(
      `GATEWAY_NETWORK_ENV must be "testnet" or "mainnet", got ${JSON.stringify(networkEnv)}`
    );
  }
  const gateway = createGatewayMiddleware({
    sellerAddress,
    facilitatorUrl: GATEWAY_FACILITATOR_URLS[networkEnv],
  });
  paidGate = gateway.require(PRICE_PER_PROFILE);
  console.log(`Gateway facilitator: ${networkEnv} (${GATEWAY_FACILITATOR_URLS[networkEnv]})`);
}

// --- Free endpoints ---------------------------------------------------------

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Teaser list: enough for an agent to decide what to buy.
app.get("/v1/stablecoins", (_req, res) => {
  res.json({
    count: listSummaries().length,
    stablecoins: listSummaries(),
    profile_endpoint: "/v1/stablecoins/{ticker}",
    profile_price_usdc: PRICE_PER_PROFILE,
    source: SOURCE,
    disclaimer: DISCLAIMER,
  });
});

// --- Paid endpoint -----------------------------------------------------------

// Reject unknown tickers BEFORE the payment gate. The Gateway middleware
// settles inline before calling the handler, so a 404 checked afterwards
// would mean the agent already paid for nothing.
const requireKnownTicker: RequestHandler = (req, res, next) => {
  if (!getProfile(req.params.ticker)) {
    res.status(404).json({
      error: "unknown_ticker",
      hint: "GET /v1/stablecoins for available tickers",
      source: SOURCE,
      disclaimer: DISCLAIMER,
    });
    return;
  }
  next();
};

// Compliance: every response carries `source` and `disclaimer`. The Gateway
// middleware writes its 402/4xx bodies with raw res.end(JSON), so merge the
// fields in at that layer. Success responses are left to the handler.
const withComplianceFields: RequestHandler = (_req, res, next) => {
  const originalEnd = res.end.bind(res) as (...args: unknown[]) => typeof res;
  res.end = ((chunk?: unknown, ...rest: unknown[]) => {
    const isJson = String(res.getHeader("Content-Type") ?? "").includes("application/json");
    if (res.statusCode >= 400 && isJson && chunk != null && !res.headersSent) {
      try {
        const body: unknown = JSON.parse(Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk));
        if (body && typeof body === "object" && !Array.isArray(body)) {
          chunk = JSON.stringify({ ...body, source: SOURCE, disclaimer: DISCLAIMER });
          res.removeHeader("Content-Length");
        }
      } catch {
        // Not a JSON body; pass it through untouched.
      }
    }
    return originalEnd(chunk, ...rest);
  }) as typeof res.end;
  next();
};

app.get(
  "/v1/stablecoins/:ticker",
  requireKnownTicker,
  withComplianceFields,
  paidGate,
  (req, res) => {
    // requireKnownTicker guarantees the profile exists.
    const profile = getProfile(req.params.ticker)!;
    res.json({ ...profile, source: SOURCE, disclaimer: DISCLAIMER });
  }
);

app.listen(PORT, () => {
  console.log(
    `atlas-agent-api on :${PORT} — payments ${PAYMENTS_ENABLED ? "ENABLED (" + PRICE_PER_PROFILE + "/profile)" : "disabled (free mode)"}`
  );
});
