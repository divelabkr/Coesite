import { createHash } from "node:crypto";

import { Inject, Injectable, Optional } from "@nestjs/common";

import {
  SIREN_OPTIONS,
  type PolyintentOptions,
  type PolyintentResult,
  type SirenIntent,
  type SirenIntentCategory,
} from "./types";

const DEFAULT_MAX_DEPTH = 4;
const DEFAULT_MAX_STRING_BYTES = 16_384;
const DEFAULT_MAX_STRING_FIELDS = 128;

interface IntentRule {
  readonly category: Exclude<SirenIntentCategory, "benign_task">;
  readonly id: string;
  readonly weight: number;
  readonly patterns: readonly RegExp[];
}

interface TextSegment {
  readonly path: string;
  readonly value: string;
}

const INTENT_RULES: readonly IntentRule[] = [
  {
    category: "credential_probe",
    id: "siren.intent.credential_probe.v1",
    patterns: [/\bapi\s+key\b/iu, /\bsigning\s+material\b/iu, /\bcredential(?:s)?\b/iu],
    weight: 100,
  },
  {
    category: "data_exfiltration",
    id: "siren.intent.data_exfiltration.v1",
    patterns: [
      /export\s+all\s+(?:customer|user|tenant)\s+records/iu,
      /dump\s+all\s+(?:customer|user|tenant)\s+data/iu,
      /\ball\s+customer\s+records\b/iu,
    ],
    weight: 95,
  },
  {
    category: "tool_injection",
    id: "siren.intent.tool_injection.v1",
    patterns: [/call\s+(?:the\s+)?(?:private\s+)?tool/iu, /\badmin\s+scope\b/iu],
    weight: 85,
  },
  {
    category: "policy_bypass",
    id: "siren.intent.policy_bypass.v1",
    patterns: [/disable\s+(?:the\s+)?guardrail/iu, /bypass\s+(?:safety\s+)?policy/iu],
    weight: 80,
  },
  {
    category: "role_override",
    id: "siren.intent.role_override.v1",
    patterns: [/ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions?/iu],
    weight: 70,
  },
  {
    category: "prompt_obfuscation",
    id: "siren.intent.prompt_obfuscation.v1",
    patterns: [
      /i\s*g\s*n\s*o\s*r\s*e\s+p\s*r\s*e\s*v\s*i\s*o\s*u\s*s\s+i\s*n\s*s\s*t\s*r\s*u\s*c\s*t\s*i\s*o\s*n\s*s/iu,
    ],
    weight: 70,
  },
  {
    category: "cross_context_reference",
    id: "siren.intent.cross_context_reference.v1",
    patterns: [/\banother\s+tenant\b/iu, /\bother\s+workspace\b/iu],
    weight: 65,
  },
  {
    category: "unsafe_code_execution",
    id: "siren.intent.unsafe_code_execution.v1",
    patterns: [/\bshell\s+command\b/iu, /\brun\b.+\bon\s+the\s+host\b/iu],
    weight: 60,
  },
];

export class PolyintentInputLimitError extends Error {
  constructor(readonly reason: "depth" | "string_bytes" | "string_fields") {
    super(reason);
    this.name = "PolyintentInputLimitError";
  }
}

@Injectable()
export class PolyintentService {
  private readonly maxDepth: number;
  private readonly maxStringBytes: number;
  private readonly maxStringFields: number;

  constructor(
    @Optional()
    @Inject(SIREN_OPTIONS)
    options: PolyintentOptions = {},
  ) {
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.maxStringBytes = options.maxStringBytes ?? DEFAULT_MAX_STRING_BYTES;
    this.maxStringFields = options.maxStringFields ?? DEFAULT_MAX_STRING_FIELDS;
  }

  analyze(input: unknown): PolyintentResult {
    try {
      return this.analyzeSegments(this.collectSegments(input));
    } catch (error) {
      if (error instanceof PolyintentInputLimitError) {
        return {
          entropy: 0,
          intents: [],
          reason: "input_limit_exceeded",
          riskScore: 100,
          route: "DENY",
        };
      }

      throw error;
    }
  }

  analyzeText(input: string): PolyintentResult {
    this.assertStringWithinLimit(input);
    return this.analyzeSegments([{ path: "$", value: input }]);
  }

  private analyzeSegments(segments: readonly TextSegment[]): PolyintentResult {
    const matched: SirenIntent[] = [];
    const seenCategories = new Set<SirenIntentCategory>();

    for (const rule of INTENT_RULES) {
      if (seenCategories.has(rule.category)) {
        continue;
      }

      const evidenceHash = this.findEvidenceHash(rule, segments);
      if (evidenceHash !== undefined) {
        matched.push({
          category: rule.category,
          evidenceHash,
          probability: 0,
          ruleId: rule.id,
          weight: rule.weight,
        });
        seenCategories.add(rule.category);
      }
    }

    if (matched.length === 0) {
      return {
        entropy: 0,
        intents: [
          {
            category: "benign_task",
            evidenceHash: hashEvidence("siren.intent.benign_task.v1", "benign"),
            probability: 1,
            ruleId: "siren.intent.benign_task.v1",
            weight: 1,
          },
        ],
        reason: "benign_single_intent",
        riskScore: 0,
        route: "ALLOW",
      };
    }

    const totalWeight = matched.reduce((sum, intent) => sum + intent.weight, 0);
    const intents = matched
      .map((intent) => ({
        ...intent,
        probability: round(intent.weight / totalWeight),
      }))
      .sort((left, right) => right.probability - left.probability);

    return {
      entropy: normalizedEntropy(intents.map((intent) => intent.probability)),
      intents,
      reason: "suspicious_intent",
      riskScore: Math.min(100, totalWeight),
      route: "DECEPTION_GATE",
    };
  }

  private findEvidenceHash(
    rule: IntentRule,
    segments: readonly TextSegment[],
  ): string | undefined {
    for (const segment of segments) {
      for (const pattern of rule.patterns) {
        if (pattern.test(segment.value)) {
          return hashEvidence(rule.id, segment.value);
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
      throw new PolyintentInputLimitError("depth");
    }

    if (typeof value === "string") {
      this.assertStringWithinLimit(value);
      if (segments.length >= this.maxStringFields) {
        throw new PolyintentInputLimitError("string_fields");
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
      throw new PolyintentInputLimitError("string_bytes");
    }
  }
}

function normalizedEntropy(probabilities: readonly number[]): number {
  if (probabilities.length <= 1) {
    return 0;
  }

  const entropy = probabilities.reduce(
    (sum, probability) => sum - probability * Math.log2(probability),
    0,
  );
  return round(entropy / Math.log2(probabilities.length));
}

function round(value: number): number {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

function hashEvidence(ruleId: string, text: string): string {
  return createHash("sha256")
    .update(`${ruleId}:${text}`)
    .digest("hex")
    .slice(0, 32);
}
