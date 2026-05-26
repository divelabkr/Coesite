import type { M1GateEvaluation, M1GtedMetadata } from "../allowlist-gted";
import type { SemanticFirewallResult } from "../semantic-firewall";
import type {
  DecoyResponse,
  HoneypotAccessRecord,
  HoneypotRoute,
  PolyintentResult,
} from "../siren";

export type MetaLayerControl = "ALLOW" | "DECEIVE" | "DENY";

export type MetaLayerReason =
  | "allow"
  | "honeypot_access"
  | "m1_block"
  | "semantic_block"
  | "siren_deception"
  | "siren_deny";

export interface MetaLayerInput {
  readonly candidateTokens?: readonly string[];
  readonly path: string;
  readonly payload: unknown;
  readonly requestId: string;
  readonly sessionRef: string;
  readonly sourceIp: string;
}

export interface MetaLayerEvaluation {
  readonly control: MetaLayerControl;
  readonly reason: MetaLayerReason;
  readonly m1: readonly M1GateEvaluation[];
  readonly semantic: SemanticFirewallResult;
  readonly polyintent: PolyintentResult;
  readonly decoy?: DecoyResponse;
  readonly honeypotRoutes: readonly HoneypotRoute[];
  readonly honeypotRecord?: HoneypotAccessRecord;
}

export interface MetaLayerHttpRequest {
  readonly body?: unknown;
  readonly query?: unknown;
  readonly headers?: Record<string, string | string[] | undefined>;
  readonly method?: string;
  readonly originalUrl?: string;
  readonly url?: string;
  readonly ip?: string;
  readonly socket?: { readonly remoteAddress?: string };
  m1GtedMetadata?: M1GtedMetadata;
  metaLayerMetadata?: MetaLayerEvaluation;
}
