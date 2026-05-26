import { createHash } from "node:crypto";

import { Inject, Injectable, Optional } from "@nestjs/common";

import {
  SEMANTIC_FIREWALL_OPTIONS,
  type SemanticFirewallCategory,
  type SemanticFirewallFinding,
  type SemanticFirewallOptions,
  type SemanticFirewallResult,
} from "./types";

const DEFAULT_BLOCK_THRESHOLD = 80;
const DEFAULT_OBSERVE_THRESHOLD = 40;
const DEFAULT_MAX_DEPTH = 4;
const DEFAULT_MAX_STRING_BYTES = 16_384;
const DEFAULT_MAX_STRING_FIELDS = 128;

interface SemanticRule {
  readonly category: SemanticFirewallCategory;
  readonly id: string;
  readonly weight: number;
  readonly patterns: readonly RegExp[];
}

interface TextSegment {
  readonly path: string;
  readonly value: string;
}

const SEMANTIC_RULES: readonly SemanticRule[] = [
  {
    category: "role_override",
    id: "sf.role.override.v1",
    patterns: [
      /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions?/iu,
      /act\s+as\s+(?:root|admin|developer|system)\b/iu,
    ],
    weight: 45,
  },
  {
    category: "system_prompt_leak",
    id: "sf.system.prompt_leak.v1",
    patterns: [
      /system\s+prompt/iu,
      /developer\s+rules?/iu,
      /hidden\s+(?:system|developer|instruction|rule)/iu,
    ],
    weight: 45,
  },
  {
    category: "policy_bypass",
    id: "sf.policy.bypass.v1",
    patterns: [
      /bypass\s+(?:every|all|the)?\s*(?:safety\s+)?polic(?:y|ies)/iu,
      /disable\s+(?:the\s+)?guardrail/iu,
    ],
    weight: 50,
  },
  {
    category: "tool_injection",
    id: "sf.tool.injection.v1",
    patterns: [
      /call\s+(?:the\s+)?(?:private\s+)?tool/iu,
      /\badmin\s+scope\b/iu,
      /\btool\s*call\b/iu,
    ],
    weight: 45,
  },
  {
    category: "data_exfiltration",
    id: "sf.data.exfiltration.v1",
    patterns: [
      /export\s+all\s+(?:customer|user|tenant)\s+records/iu,
      /dump\s+all\s+(?:customer|user|tenant)\s+data/iu,
      /\ball\s+customer\s+records\b/iu,
    ],
    weight: 45,
  },
  {
    category: "credential_request",
    id: "sf.credential.request.v1",
    patterns: [
      /\bapi\s+key\b/iu,
      /\bsigning\s+material\b/iu,
      /\bcredential(?:s)?\b/iu,
    ],
    weight: 45,
  },
  {
    category: "unsafe_code_execution",
    id: "sf.execution.host_command.v1",
    patterns: [
      /\bshell\s+command\b/iu,
      /\brun\b.+\bon\s+the\s+host\b/iu,
      /\bexecute\s+(?:bash|cmd|powershell)\b/iu,
    ],
    weight: 40,
  },
  {
    category: "cross_context_reference",
    id: "sf.context.cross_reference.v1",
    patterns: [
      /\banother\s+tenant\b/iu,
      /\bother\s+workspace\b/iu,
      /\bcross[-\s]?tenant\b/iu,
    ],
    weight: 40,
  },
  {
    category: "prompt_obfuscation",
    id: "sf.prompt.obfuscation.v1",
    patterns: [
      /i\s*g\s*n\s*o\s*r\s*e\s+p\s*r\s*e\s*v\s*i\s*o\s*u\s*s\s+i\s*n\s*s\s*t\s*r\s*u\s*c\s*t\s*i\s*o\s*n\s*s/iu,
      /b\s*y\s*p\s*a\s*s\s+s\s*a\s*f\s*e\s*t\s*y/iu,
    ],
    weight: 45,
  },
];

export class SemanticInputLimitError extends Error {
  constructor(readonly reason: "depth" | "string_bytes" | "string_fields") {
    super(reason);
    this.name = "SemanticInputLimitError";
  }
}

@Injectable()
export class SemanticFirewallService {
  private readonly blockThreshold: number;
  private readonly observeThreshold: number;
  private readonly maxDepth: number;
  private readonly maxStringBytes: number;
  private readonly maxStringFields: number;

  constructor(
    @Optional()
    @Inject(SEMANTIC_FIREWALL_OPTIONS)
    options: SemanticFirewallOptions = {},
  ) {
    this.blockThreshold = options.blockThreshold ?? DEFAULT_BLOCK_THRESHOLD;
    this.observeThreshold = options.observeThreshold ?? DEFAULT_OBSERVE_THRESHOLD;
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.maxStringBytes = options.maxStringBytes ?? DEFAULT_MAX_STRING_BYTES;
    this.maxStringFields = options.maxStringFields ?? DEFAULT_MAX_STRING_FIELDS;
  }

  inspect(input: unknown): SemanticFirewallResult {
    try {
      return this.inspectSegments(this.collectSegments(input));
    } catch (error) {
      if (error instanceof SemanticInputLimitError) {
        return {
          control: "BLOCK",
          findings: [],
          reason: "input_limit_exceeded",
          riskScore: 100,
        };
      }

      throw error;
    }
  }

  inspectText(input: string): SemanticFirewallResult {
    this.assertStringWithinLimit(input);
    return this.inspectSegments([{ path: "$", value: input }]);
  }

  private inspectSegments(
    segments: readonly TextSegment[],
  ): SemanticFirewallResult {
    const findings: SemanticFirewallFinding[] = [];
    const seenCategories = new Set<SemanticFirewallCategory>();

    for (const rule of SEMANTIC_RULES) {
      if (seenCategories.has(rule.category)) {
        continue;
      }

      const finding = this.findRuleMatch(rule, segments);
      if (finding !== undefined) {
        findings.push(finding);
        seenCategories.add(rule.category);
      }
    }

    const riskScore = Math.min(
      100,
      findings.reduce((sum, finding) => sum + finding.weight, 0),
    );
    if (riskScore >= this.blockThreshold) {
      return {
        control: "BLOCK",
        findings,
        reason: "semantic_block",
        riskScore,
      };
    }

    if (riskScore >= this.observeThreshold) {
      return {
        control: "OBSERVE",
        findings,
        handoff: "SIREN",
        reason: "semantic_observe",
        riskScore,
      };
    }

    return {
      control: "PASS",
      findings,
      reason: "no_findings",
      riskScore,
    };
  }

  private findRuleMatch(
    rule: SemanticRule,
    segments: readonly TextSegment[],
  ): SemanticFirewallFinding | undefined {
    for (const segment of segments) {
      for (const pattern of rule.patterns) {
        if (pattern.test(segment.value)) {
          return {
            category: rule.category,
            evidenceHash: hashEvidence(rule.id, segment.value),
            path: segment.path,
            ruleId: rule.id,
            weight: rule.weight,
          };
        }
      }
    }

    return undefined;
  }

  private collectSegments(input: unknown): readonly TextSegment[] {
    const segments: TextSegment[] = [];
    this.collectValue(input, "$", 0, segments);
    return segments;
  }

  private collectValue(
    value: unknown,
    path: string,
    depth: number,
    segments: TextSegment[],
  ): void {
    if (depth > this.maxDepth) {
      throw new SemanticInputLimitError("depth");
    }

    if (typeof value === "string") {
      this.assertStringWithinLimit(value);
      if (segments.length >= this.maxStringFields) {
        throw new SemanticInputLimitError("string_fields");
      }
      segments.push({ path, value });
      return;
    }

    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        this.collectValue(value[index], `${path}[${index}]`, depth + 1, segments);
      }
      return;
    }

    if (value !== null && typeof value === "object") {
      for (const key of Object.keys(value).sort()) {
        this.collectValue(
          (value as Record<string, unknown>)[key],
          `${path}.${key}`,
          depth + 1,
          segments,
        );
      }
    }
  }

  private assertStringWithinLimit(value: string): void {
    if (Buffer.byteLength(value) > this.maxStringBytes) {
      throw new SemanticInputLimitError("string_bytes");
    }
  }
}

function hashEvidence(ruleId: string, text: string): string {
  return createHash("sha256")
    .update(`${ruleId}:${text}`)
    .digest("hex")
    .slice(0, 32);
}
