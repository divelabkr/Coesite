import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ProvenanceChainService } from "./provenance-chain.service";

describe("ProvenanceChainService durable append adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("persists provenance records to the configured append-only path", () => {
    const appendPath = join(
      mkdtempSync(join(tmpdir(), "coesite-provenance-")),
      "provenance.jsonl",
    );
    vi.stubEnv("COESITE_PROVENANCE_APPEND_PATH", appendPath);
    const service = new ProvenanceChainService();

    const record = service.append({
      agentId: "agent-1",
      payloadHash: "payload-hash",
      policyVersion: "policy-1",
      runtimeVersion: "runtime-1",
    });

    const lines = readFileSync(appendPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toMatchObject({
      agentId: "agent-1",
      hash: record.hash,
      prevHash: "GENESIS",
    });
  });

  it("loads existing append records on restart before appending", () => {
    const appendPath = join(
      mkdtempSync(join(tmpdir(), "coesite-provenance-")),
      "provenance.jsonl",
    );
    vi.stubEnv("COESITE_PROVENANCE_APPEND_PATH", appendPath);
    const service = new ProvenanceChainService();
    const first = service.append({
      agentId: "agent-1",
      payloadHash: "payload-hash-1",
      policyVersion: "policy-1",
      runtimeVersion: "runtime-1",
    });

    const restarted = new ProvenanceChainService();
    const second = restarted.append({
      agentId: "agent-1",
      payloadHash: "payload-hash-2",
      policyVersion: "policy-1",
      runtimeVersion: "runtime-1",
    });

    expect(second.prevHash).toBe(first.hash);
    expect(restarted.verify()).toBe(true);
  });

  it("reloads durable append state before each write so stale workers cannot fork chains", () => {
    const appendPath = join(
      mkdtempSync(join(tmpdir(), "coesite-provenance-")),
      "provenance.jsonl",
    );
    vi.stubEnv("COESITE_PROVENANCE_APPEND_PATH", appendPath);
    const active = new ProvenanceChainService();
    const stale = new ProvenanceChainService();
    const first = active.append({
      agentId: "agent-1",
      payloadHash: "payload-hash-1",
      policyVersion: "policy-1",
      runtimeVersion: "runtime-1",
    });

    const second = stale.append({
      agentId: "agent-2",
      payloadHash: "payload-hash-2",
      policyVersion: "policy-1",
      runtimeVersion: "runtime-1",
    });
    const restarted = new ProvenanceChainService();

    expect(second.prevHash).toBe(first.hash);
    expect(restarted.verify()).toBe(true);
  });

  it("fails closed when an existing provenance log has been tampered", () => {
    const appendPath = join(
      mkdtempSync(join(tmpdir(), "coesite-provenance-")),
      "provenance.jsonl",
    );
    vi.stubEnv("COESITE_PROVENANCE_APPEND_PATH", appendPath);
    const service = new ProvenanceChainService();
    service.append({
      agentId: "agent-1",
      payloadHash: "payload-hash-1",
      policyVersion: "policy-1",
      runtimeVersion: "runtime-1",
    });
    const tampered = readFileSync(appendPath, "utf8").replace("payload-hash-1", "payload-hash-x");
    writeFileSync(appendPath, tampered, "utf8");

    expect(() => new ProvenanceChainService()).toThrow("provenance_append_log_invalid");
  });
});
