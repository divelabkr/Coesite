import {
  appendFileSync,
  closeSync,
  constants,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

const APPEND_LOCK_RETRY_MS = 25;
const APPEND_LOCK_TIMEOUT_MS = 5_000;

export interface AppendOnlyJsonlOptions<T> {
  readonly appendPath: string | undefined;
  readonly errorCode: string;
  readonly isRecord: (value: unknown) => value is T;
  readonly verify: (records: readonly T[]) => boolean;
}

export interface AppendVerifiedJsonlOptions<T> extends AppendOnlyJsonlOptions<T> {
  readonly createRecord: (records: readonly T[]) => T;
}

export interface AppendVerifiedJsonlResult<T> {
  readonly record: T;
  readonly records: readonly T[];
}

export function loadAppendOnlyJsonl<T>(
  options: AppendOnlyJsonlOptions<T>,
): T[] {
  if (options.appendPath === undefined) {
    return [];
  }

  mkdirSync(dirname(options.appendPath), { recursive: true });
  if (!existsSync(options.appendPath)) {
    return [];
  }

  const records = parseJsonl(options);
  if (!options.verify(records)) {
    throw new Error(options.errorCode);
  }

  return records;
}

export function appendVerifiedJsonlRecord<T>(
  options: AppendVerifiedJsonlOptions<T>,
): AppendVerifiedJsonlResult<T> {
  if (options.appendPath === undefined) {
    const record = options.createRecord([]);
    const records = [record];
    if (!options.verify(records)) {
      throw new Error(options.errorCode);
    }
    return { record, records };
  }

  mkdirSync(dirname(options.appendPath), { recursive: true });
  const releaseLock = acquireAppendLock(options.appendPath, options.errorCode);
  try {
    const records = loadAppendOnlyJsonl(options);
    const record = options.createRecord(records);
    const nextRecords = [...records, record];
    if (!options.verify(nextRecords)) {
      throw new Error(options.errorCode);
    }
    appendJsonlRecord(options.appendPath, record);
    return { record, records: nextRecords };
  } finally {
    releaseLock();
  }
}

export function appendJsonlRecord(
  appendPath: string | undefined,
  record: unknown,
): void {
  if (appendPath === undefined) {
    return;
  }

  appendFileSync(appendPath, `${JSON.stringify(record)}\n`, {
    encoding: "utf8",
    flag: "a",
  });
}

function acquireAppendLock(appendPath: string, errorCode: string): () => void {
  const lockPath = `${appendPath}.lock`;
  const deadline = Date.now() + APPEND_LOCK_TIMEOUT_MS;

  while (Date.now() <= deadline) {
    try {
      const fd = openSync(
        lockPath,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
        0o600,
      );
      writeFileSync(fd, `${process.pid}:${new Date().toISOString()}\n`, "utf8");
      closeSync(fd);
      return releaseAppendLock(lockPath, errorCode);
    } catch (error) {
      if (!isNodeError(error) || error.code !== "EEXIST") {
        throw new Error(`${errorCode}:append_lock_failed`);
      }
      sleepSync(APPEND_LOCK_RETRY_MS);
    }
  }

  throw new Error(`${errorCode}:append_lock_timeout`);
}

function releaseAppendLock(lockPath: string, errorCode: string): () => void {
  let released = false;
  return () => {
    if (released) {
      return;
    }

    try {
      unlinkSync(lockPath);
      released = true;
    } catch (_error) {
      throw new Error(`${errorCode}:append_lock_release_failed`);
    }
  };
}

function sleepSync(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function parseJsonl<T>(options: AppendOnlyJsonlOptions<T>): T[] {
  const content = readFileSync(options.appendPath!, "utf8");
  if (content.trim() === "") {
    return [];
  }

  const records: T[] = [];
  const lines = content.split(/\r?\n/u);
  for (const [index, line] of lines.entries()) {
    if (line.trim() === "") {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch (_error) {
      throw new Error(`${options.errorCode}:malformed_json:${index + 1}`);
    }

    if (!options.isRecord(parsed)) {
      throw new Error(`${options.errorCode}:invalid_record:${index + 1}`);
    }
    records.push(parsed);
  }

  return records;
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value;
}
