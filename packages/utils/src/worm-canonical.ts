import { createHash } from "node:crypto";

export const WORM_CANONICAL_VERSION = "worm-canonical-v1";
export const WORM_GENESIS_PREV_HASH = "GENESIS";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;

export type WormCanonicalTable =
  | "AuditLog"
  | "WormLog"
  | "AdminActionLog"
  | "DmsTriggerLog"
  | "ProofBundle";

export interface WormCanonicalPartition {
  readonly field:
    | "agentId"
    | "source"
    | "adminId"
    | "triggerType"
    | "sessionId";
  readonly value: string;
}

export interface WormCanonicalInput {
  readonly table: WormCanonicalTable;
  readonly partition: WormCanonicalPartition;
  readonly prevHash: string;
  readonly createdAt: Date | string;
  readonly fields: Record<string, unknown>;
}

export function buildWormAppendEnvelope(
  input: Omit<WormCanonicalInput, "createdAt"> & {
    readonly createdAt?: Date | string;
  },
): WormCanonicalInput & { readonly hash: string } {
  const createdAt = input.createdAt ?? new Date();
  const canonicalInput: WormCanonicalInput = {
    ...input,
    createdAt,
  };

  return {
    ...canonicalInput,
    hash: createWormCanonicalHash(canonicalInput),
  };
}

export function createWormCanonicalHash(input: WormCanonicalInput): string {
  return createHash("sha256")
    .update(stableStringify(normalizeCanonicalInput(input)))
    .digest("hex");
}

export function verifyWormCanonicalHash(
  input: WormCanonicalInput,
  hash: string,
): boolean {
  return HASH_PATTERN.test(hash) && createWormCanonicalHash(input) === hash;
}

function normalizeCanonicalInput(input: WormCanonicalInput): unknown {
  assertKnownTable(input.table);
  assertPartition(input.table, input.partition);
  assertPrevHash(input.prevHash);

  return {
    createdAt: normalizeCreatedAt(input.createdAt),
    fields: normalizeJsonValue(input.fields),
    partition: input.partition,
    prevHash: input.prevHash,
    table: input.table,
    version: WORM_CANONICAL_VERSION,
  };
}

function assertKnownTable(table: WormCanonicalTable): void {
  const knownTables = new Set<WormCanonicalTable>([
    "AuditLog",
    "WormLog",
    "AdminActionLog",
    "DmsTriggerLog",
    "ProofBundle",
  ]);

  if (!knownTables.has(table)) {
    throw new Error("unsupported WORM table");
  }
}

function assertPartition(
  table: WormCanonicalTable,
  partition: WormCanonicalPartition,
): void {
  const expectedFieldByTable: Record<WormCanonicalTable, WormCanonicalPartition["field"]> = {
    AdminActionLog: "adminId",
    AuditLog: "agentId",
    DmsTriggerLog: "triggerType",
    ProofBundle: "sessionId",
    WormLog: "source",
  };

  if (
    partition.field !== expectedFieldByTable[table] ||
    partition.value.trim() === ""
  ) {
    throw new Error("invalid WORM partition");
  }
}

function assertPrevHash(prevHash: string): void {
  if (prevHash === WORM_GENESIS_PREV_HASH || HASH_PATTERN.test(prevHash)) {
    return;
  }

  throw new Error("invalid WORM prevHash");
}

function normalizeCreatedAt(createdAt: Date | string): string {
  const value =
    createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString();
  if (Number.isNaN(Date.parse(value))) {
    throw new Error("invalid WORM createdAt");
  }

  return value;
}

function normalizeJsonValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("invalid WORM numeric value");
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return normalizeJsonObject(value as Record<string, unknown>);
  }

  throw new Error("unsupported WORM canonical value");
}

function normalizeJsonObject(value: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const key of Object.keys(value).sort()) {
    Object.defineProperty(normalized, key, {
      configurable: true,
      enumerable: true,
      value: normalizeJsonValue(value[key]),
      writable: false,
    });
  }

  return normalized;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}
