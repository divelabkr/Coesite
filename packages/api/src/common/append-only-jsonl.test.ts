import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAppendOnlyJsonl } from "./append-only-jsonl";

interface TestRecord {
  readonly hash: string;
  readonly value: string;
}

describe("append-only JSONL loader", () => {
  it("loads verified records from an existing append path", () => {
    const appendPath = createPath();
    writeFileSync(appendPath, `${JSON.stringify({ hash: "h1", value: "v1" })}\n`);

    const records = loadAppendOnlyJsonl({
      appendPath,
      errorCode: "test_append_invalid",
      isRecord: isTestRecord,
      verify: (items) => items.length === 1 && items[0]?.hash === "h1",
    });

    expect(records).toEqual([{ hash: "h1", value: "v1" }]);
  });

  it("fails closed for malformed JSONL records", () => {
    const appendPath = createPath();
    writeFileSync(appendPath, "{not-json}\n");

    expect(() =>
      loadAppendOnlyJsonl({
        appendPath,
        errorCode: "test_append_invalid",
        isRecord: isTestRecord,
        verify: () => true,
      }),
    ).toThrow("test_append_invalid:malformed_json:1");
  });

  it("fails closed when chain verification rejects loaded records", () => {
    const appendPath = createPath();
    writeFileSync(appendPath, `${JSON.stringify({ hash: "h1", value: "v1" })}\n`);

    expect(() =>
      loadAppendOnlyJsonl({
        appendPath,
        errorCode: "test_append_invalid",
        isRecord: isTestRecord,
        verify: () => false,
      }),
    ).toThrow("test_append_invalid");
  });
});

function createPath(): string {
  return join(mkdtempSync(join(tmpdir(), "coesite-jsonl-")), "records.jsonl");
}

function isTestRecord(value: unknown): value is TestRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<TestRecord>;
  return typeof record.hash === "string" && typeof record.value === "string";
}
