export const SIREN_OPTIONS = Symbol("SIREN_OPTIONS");

export type SirenIntentCategory =
  | "benign_task"
  | "credential_probe"
  | "cross_context_reference"
  | "data_exfiltration"
  | "policy_bypass"
  | "prompt_obfuscation"
  | "role_override"
  | "tool_injection"
  | "unsafe_code_execution";

export type SirenRoute = "ALLOW" | "DECEPTION_GATE" | "DENY";

export type PolyintentReason =
  | "benign_single_intent"
  | "input_limit_exceeded"
  | "suspicious_intent";

export interface SirenIntent {
  readonly category: SirenIntentCategory;
  readonly probability: number;
  readonly ruleId: string;
  readonly weight: number;
  readonly evidenceHash: string;
}

export interface PolyintentResult {
  readonly route: SirenRoute;
  readonly reason: PolyintentReason;
  readonly entropy: number;
  readonly riskScore: number;
  readonly intents: readonly SirenIntent[];
}

export interface PolyintentOptions {
  readonly maxDepth?: number;
  readonly maxStringBytes?: number;
  readonly maxStringFields?: number;
}

export type DecoyStrategy =
  | "DELAYED_REVIEW"
  | "LOW_INFORMATION_ACK"
  | "NEUTRAL_ACK"
  | "NO_DECOY";

export interface UtilityInversionResult {
  readonly strategy: DecoyStrategy;
  readonly estimatedUtilityBefore: number;
  readonly expectedUtilityAfter: number;
}

export interface DecoyRequestContext {
  readonly requestId: string;
}

export interface DecoyResponse {
  readonly control: "DECEIVE";
  readonly decoyId: string;
  readonly body: string;
  readonly bodyBytes: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly watermark: string;
  readonly pingbackUrl: string;
  readonly strategy: DecoyStrategy;
  readonly estimatedUtilityBefore: number;
  readonly expectedUtilityAfter: number;
}

export interface HoneypotRouteContext {
  readonly requestId: string;
}

export interface HoneypotRoute {
  readonly path: string;
  readonly category: SirenIntentCategory;
  readonly routeId: string;
}

export interface HoneypotAccessInput {
  readonly path: string;
  readonly requestId: string;
  readonly sessionRef: string;
  readonly sourceIp: string;
}

export interface HoneypotAccessRecord {
  readonly path: string;
  readonly requestId: string;
  readonly sessionRefHash: string;
  readonly sourceIpHash: string;
  readonly createdAt: string;
  readonly prevHash: string;
  readonly hash: string;
}

export interface HoneypotOptions {
  readonly appendPath?: string;
  readonly maxRoutes?: number;
  readonly now?: () => Date;
}
