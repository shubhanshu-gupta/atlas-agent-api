import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { StablecoinProfile, StablecoinSummary } from "./types.js";

const DATA_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "stablecoins"
);

const profiles = new Map<string, StablecoinProfile>();

for (const file of readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"))) {
  const profile = JSON.parse(
    readFileSync(join(DATA_DIR, file), "utf-8")
  ) as StablecoinProfile;
  profiles.set(profile.ticker.toLowerCase(), profile);
}

export function getProfile(ticker: string): StablecoinProfile | undefined {
  return profiles.get(ticker.toLowerCase());
}

export function listSummaries(): StablecoinSummary[] {
  return [...profiles.values()].map((p) => ({
    ticker: p.ticker,
    name: p.name,
    peg_currency: p.peg_currency,
    type: p.type,
    issuer_name: p.issuer.name,
    badge_codes: p.badges.map((b) => b.code),
  }));
}
