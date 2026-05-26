import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import { WormLogService } from "./worm-log.service";

describe("WormLogService durable append adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("persists appended WORM records to the configured append-only path", () => {
    const appendPath = join(mkdtempSync(join(tmpdir(), "coesite-worm-")), "worm.jsonl");
    vi.stubEnv("COESITE_WORM_APPEND_PATH", appendPath);
    const service = new WormLogService();

    const record = service.append({
      level: "INFO",
      message: "PASS",
      source: "SeyerGate",
    });

    const lines = readFileSync(appendPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toMatchObject({
      hash: record.hash,
      prevHash: "GENESIS",
      source: "SeyerGate",
    });
  });

  it("loads existing append records on restart before appending", () => {
    const appendPath = join(mkdtempSync(join(tmpdir(), "coesite-worm-")), "worm.jsonl");
    vi.stubEnv("COESITE_WORM_APPEND_PATH", appendPath);
    const service = new WormLogService();
    const first = service.append({
      level: "INFO",
      message: "PASS",
      source: "SeyerGate",
    });

    const restarted = new WormLogService();
    const second = restarted.append({
      level: "WARN",
      message: "BLOCK",
      source: "SeyerGate",
    });

    expect(restarted.records).toHaveLength(2);
    expect(second.prevHash).toBe(first.hash);
    expect(restarted.verify()).toBe(true);
  });

  it("reloads durable append state before each write so stale workers cannot fork chains", () => {
    const appendPath = join(mkdtempSync(join(tmpdir(), "coesite-worm-")), "worm.jsonl");
    vi.stubEnv("COESITE_WORM_APPEND_PATH", appendPath);
    const active = new WormLogService();
    const stale = new WormLogService();
    const first = active.append({
      level: "INFO",
      message: "PASS",
      source: "SeyerGate",
    });

    const second = stale.append({
      level: "WARN",
      message: "BLOCK",
      source: "SeyerGate",
    });
    const restarted = new WormLogService();

    expect(second.prevHash).toBe(first.hash);
    expect(restarted.verify()).toBe(true);
  });

  it("fails closed when an existing WORM log has been tampered", () => {
    const appendPath = join(mkdtempSync(join(tmpdir(), "coesite-worm-")), "worm.jsonl");
    vi.stubEnv("COESITE_WORM_APPEND_PATH", appendPath);
    const service = new WormLogService();
    service.append({
      level: "INFO",
      message: "PASS",
      source: "SeyerGate",
    });
    const tampered = readFileSync(appendPath, "utf8").replace('"message":"PASS"', '"message":"ALLOW"');
    writeFileSync(appendPath, tampered, "utf8");

    expect(() => new WormLogService()).toThrow("worm_append_log_invalid");
  });
});
