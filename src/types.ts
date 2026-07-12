export interface Badge {
  code:
    | "REGULATED_FRAMEWORK_ALIGNED"
    | "REDEMPTION_POLICY_DISCLOSED"
    | "ATTESTATION_OR_AUDIT_LINKED";
  jurisdiction?: string;
  basis?: string;
  cadence?: string;
  evidence_url: string;
}

export interface RegulatoryStatus {
  jurisdiction: string;
  framework: string;
  status: string;
  evidence_url: string;
}

export interface StablecoinProfile {
  ticker: string;
  name: string;
  peg_currency: string;
  issuer: {
    name: string;
    jurisdictions: string[];
  };
  type: "fiat-backed" | "crypto-backed" | "algorithmic" | "commodity-backed";
  supported_chains: string[];
  badges: Badge[];
  regulatory_status: RegulatoryStatus[];
  description: string;
  last_verified_at: string; // ISO date
}

/** Fields returned by the free list endpoint (teaser). */
export type StablecoinSummary = Pick<
  StablecoinProfile,
  "ticker" | "name" | "peg_currency" | "type"
> & { issuer_name: string; badge_codes: string[] };

export const SOURCE = "stablecoinatlas.app";
export const DISCLAIMER =
  "Informational only; not financial, investment, legal, or tax advice. Regulatory status may change; verify via linked evidence.";
