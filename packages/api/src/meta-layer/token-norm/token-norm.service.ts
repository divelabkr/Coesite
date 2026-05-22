import { Injectable } from "@nestjs/common";

import type {
  TokenNormFinding,
  TokenNormReason,
  TokenNormResult,
} from "./types";

const ZERO_WIDTH_PATTERN = /[\u200B\u200C\u200D\uFEFF]/gu;
const BIDI_CONTROL_PATTERN = /[\u202A-\u202E\u2066-\u2069]/gu;
const MAX_URL_DECODE_PASSES = 2;
const MAX_BASE64_DECODED_LENGTH = 16_384;

const HOMOGLYPH_MAP = new Map<string, string>([
  ["\u0410", "A"],
  ["\u0412", "B"],
  ["\u0421", "C"],
  ["\u0415", "E"],
  ["\u041D", "H"],
  ["\u0406", "I"],
  ["\u0408", "J"],
  ["\u041A", "K"],
  ["\u041C", "M"],
  ["\u041E", "O"],
  ["\u0420", "P"],
  ["\u0405", "S"],
  ["\u0422", "T"],
  ["\u0425", "X"],
  ["\u0423", "Y"],
  ["\u0430", "a"],
  ["\u0441", "c"],
  ["\u0435", "e"],
  ["\u0456", "i"],
  ["\u0458", "j"],
  ["\u043E", "o"],
  ["\u0440", "p"],
  ["\u0455", "s"],
  ["\u0445", "x"],
  ["\u0443", "y"],
]);

@Injectable()
export class TokenNormService {
  normalize<T>(input: T, rootPath = "$"): TokenNormResult<T> {
    const findings: TokenNormFinding[] = [];
    const value = this.normalizeValue(input, rootPath, findings) as T;
    return { value, findings };
  }

  private normalizeValue(
    value: unknown,
    path: string,
    findings: TokenNormFinding[],
  ): unknown {
    if (typeof value === "string") {
      return this.normalizeString(value, path, findings);
    }

    if (Array.isArray(value)) {
      return value.map((item, index) =>
        this.normalizeValue(item, `${path}[${index}]`, findings),
      );
    }

    if (this.isPlainObject(value)) {
      const normalized: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) {
        const normalizedKey = this.normalizeString(
          key,
          `${path}.{key:${key}}`,
          findings,
        );
        normalized[normalizedKey] = this.normalizeValue(
          item,
          `${path}.${normalizedKey}`,
          findings,
        );
      }
      return normalized;
    }

    return value;
  }

  private normalizeString(
    input: string,
    path: string,
    findings: TokenNormFinding[],
  ): string {
    let current = input;
    current = this.applyTransform(
      current,
      current.normalize("NFKC"),
      "unicode_nfkc",
      path,
      findings,
    );
    current = this.applyTransform(
      current,
      current.replace(ZERO_WIDTH_PATTERN, ""),
      "zero_width",
      path,
      findings,
    );
    current = this.applyTransform(
      current,
      current.replace(BIDI_CONTROL_PATTERN, ""),
      "bidi_control",
      path,
      findings,
    );
    current = this.applyTransform(
      current,
      this.normalizeHomoglyphs(current),
      "homoglyph",
      path,
      findings,
    );

    const urlResult = this.tryUrlDecode(current);
    if (urlResult.value !== current) {
      current = this.applyTransform(
        current,
        urlResult.value,
        urlResult.reason,
        path,
        findings,
      );
    }

    const base64Result = this.tryBase64Decode(current);
    if (base64Result !== current) {
      current = this.applyTransform(
        current,
        base64Result,
        "base64",
        path,
        findings,
      );
    }

    return current;
  }

  private applyTransform(
    original: string,
    normalized: string,
    reason: TokenNormReason,
    path: string,
    findings: TokenNormFinding[],
  ): string {
    if (original !== normalized) {
      findings.push({ path, reason, original, normalized });
    }
    return normalized;
  }

  private normalizeHomoglyphs(input: string): string {
    let output = "";
    for (const character of input) {
      output += HOMOGLYPH_MAP.get(character) ?? character;
    }
    return output;
  }

  private tryUrlDecode(input: string): { value: string; reason: TokenNormReason } {
    let current = input;
    let passes = 0;

    while (passes < MAX_URL_DECODE_PASSES && this.hasUrlEncoding(current)) {
      const decoded = this.decodeUriComponentSafe(current);
      if (decoded === null || decoded === current) {
        break;
      }
      current = decoded;
      passes += 1;
    }

    return {
      value: current,
      reason: passes > 1 ? "double_url_decode" : "url_decode",
    };
  }

  private tryBase64Decode(input: string): string {
    const candidate = input.trim();
    if (!this.looksLikeBase64(candidate)) {
      return input;
    }

    const normalizedCandidate = candidate.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalizedCandidate.padEnd(
      normalizedCandidate.length + ((4 - (normalizedCandidate.length % 4)) % 4),
      "=",
    );
    const decoded = Buffer.from(padded, "base64");
    if (
      decoded.length === 0 ||
      decoded.length > MAX_BASE64_DECODED_LENGTH ||
      decoded.toString("base64").replace(/=+$/u, "") !==
        padded.replace(/=+$/u, "")
    ) {
      return input;
    }

    const decodedText = decoded.toString("utf8");
    if (!this.isPrintableUtf8(decodedText)) {
      return input;
    }

    return decodedText;
  }

  private hasUrlEncoding(input: string): boolean {
    return /%[0-9A-Fa-f]{2}/u.test(input);
  }

  private decodeUriComponentSafe(input: string): string | null {
    try {
      return decodeURIComponent(input);
    } catch (error) {
      if (error instanceof URIError) {
        return null;
      }
      throw error;
    }
  }

  private looksLikeBase64(input: string): boolean {
    if (input.length < 8 || input.length % 4 === 1) {
      return false;
    }
    if (!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(input)) {
      return false;
    }
    return /={1,2}$/u.test(input) || input.length >= 12;
  }

  private isPrintableUtf8(input: string): boolean {
    if (input.includes("\uFFFD")) {
      return false;
    }
    return /^[\t\n\r\x20-\x7E\u00A0-\uFFFF]*$/u.test(input);
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== "object") {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
}
