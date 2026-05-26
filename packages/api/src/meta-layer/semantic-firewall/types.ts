export const SEMANTIC_FIREWALL_OPTIONS = Symbol("SEMANTIC_FIREWALL_OPTIONS");

export type SemanticFirewallCategory =
  | "credential_request"
  | "cross_context_reference"
  | "data_exfiltration"
  | "policy_bypass"
  | "prompt_obfuscation"
  | "role_override"
  | "system_prompt_leak"
  | "tool_injection"
  | "unsafe_code_execution";

export type SemanticFirewallControl = "PASS" | "OBSERVE" | "BLOCK";
export type SemanticFirewallHandoff = "SIREN";

export type SemanticFirewallReason =
  | "input_limit_exceeded"
  | "no_findings"
  | "semantic_block"
  | "semantic_observe";

export interface SemanticFirewallFinding {
  readonly category: SemanticFirewallCategory;
  readonly ruleId: string;
  readonly path: string;
  readonly weight: number;
  readonly evidenceHash: string;
}

export interface SemanticFirewallResult {
  readonly control: SemanticFirewallControl;
  readonly reason: SemanticFirewallReason;
  readonly riskScore: number;
  readonly findings: readonly SemanticFirewallFinding[];
  readonly handoff?: SemanticFirewallHandoff;
}

export interface SemanticFirewallOptions {
  readonly blockThreshold?: number;
  readonly observeThreshold?: number;
  readonly maxDepth?: number;
  readonly maxStringBytes?: number;
  readonly maxStringFields?: number;
}

export type MirrorResponseShape =
  | "normal_control"
  | "siren_handoff"
  | "uniform_rejection";

export interface MirrorExpectation {
  readonly expectedControl: SemanticFirewallControl;
  readonly responseShape: MirrorResponseShape;
  readonly handoff?: SemanticFirewallHandoff;
  readonly riskScore: number;
  readonly categories: readonly SemanticFirewallCategory[];
}

export type MirrorComparisonReason =
  | "control_mismatch"
  | "handoff_missing"
  | "invalid_response_shape"
  | "matched"
  | "response_leak_pattern";

export interface MirrorComparison {
  readonly control: "PASS" | "BLOCK";
  readonly matchesExpectation: boolean;
  readonly reason: MirrorComparisonReason;
  readonly evidenceHash?: string;
}
