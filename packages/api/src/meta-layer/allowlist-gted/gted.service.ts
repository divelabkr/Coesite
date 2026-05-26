import { Injectable } from "@nestjs/common";

import type { GtedNearestMatch } from "./types";

const DEFAULT_MAX_TOKEN_LENGTH = 128;
const DEFAULT_MAX_ALLOWLIST_ENTRIES = 512;
const INSERTION_COST = 1;
const DELETION_COST = 1;
const DEFAULT_SUBSTITUTION_COST = 1;
const GRAPH_NEIGHBOR_SUBSTITUTION_COST = 0.5;
const VISUAL_SUBSTITUTION_COST = 0.25;
const TRANSPOSITION_COST = 0.75;

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"] as const;
const VISUAL_EQUIVALENTS: readonly (readonly [string, string])[] = [
  ["0", "o"],
  ["1", "l"],
  ["1", "i"],
  ["3", "e"],
  ["4", "a"],
  ["5", "s"],
  ["7", "t"],
  ["@", "a"],
  ["$", "s"],
  ["_", "-"],
];

export class GtedError extends Error {
  constructor(readonly reason: "allowlist_too_large" | "token_too_large") {
    super(reason);
    this.name = "GtedError";
  }
}

@Injectable()
export class GtedService {
  private readonly maxAllowListEntries = DEFAULT_MAX_ALLOWLIST_ENTRIES;
  private readonly maxTokenLength = DEFAULT_MAX_TOKEN_LENGTH;
  private readonly keyboardNeighbors = buildKeyboardNeighborMap();
  private readonly visualNeighbors = buildPairMap(VISUAL_EQUIVALENTS);

  distance(source: string, target: string): number {
    const left = this.normalizeToken(source);
    const right = this.normalizeToken(target);
    const matrix = this.createMatrix(left.length + 1, right.length + 1);

    for (let row = 0; row <= left.length; row += 1) {
      matrix[row][0] = row * DELETION_COST;
    }
    for (let column = 0; column <= right.length; column += 1) {
      matrix[0][column] = column * INSERTION_COST;
    }

    for (let row = 1; row <= left.length; row += 1) {
      for (let column = 1; column <= right.length; column += 1) {
        const deleteCost = matrix[row - 1][column] + DELETION_COST;
        const insertCost = matrix[row][column - 1] + INSERTION_COST;
        const substituteCost =
          matrix[row - 1][column - 1] +
          this.substitutionCost(left[row - 1], right[column - 1]);
        let bestCost = Math.min(deleteCost, insertCost, substituteCost);

        if (
          row > 1 &&
          column > 1 &&
          left[row - 1] === right[column - 2] &&
          left[row - 2] === right[column - 1]
        ) {
          bestCost = Math.min(
            bestCost,
            matrix[row - 2][column - 2] + TRANSPOSITION_COST,
          );
        }

        matrix[row][column] = bestCost;
      }
    }

    return roundDistance(matrix[left.length][right.length]);
  }

  minDistance(candidate: string, allowList: readonly string[]): GtedNearestMatch {
    if (allowList.length > this.maxAllowListEntries) {
      throw new GtedError("allowlist_too_large");
    }

    const normalizedCandidate = this.normalizeToken(candidate).join("");
    let nearest: GtedNearestMatch | undefined;

    for (const token of allowList) {
      const distance = this.distance(normalizedCandidate, token);
      if (nearest === undefined || distance < nearest.distance) {
        nearest = { distance, token };
      }
    }

    if (nearest === undefined) {
      throw new GtedError("allowlist_too_large");
    }

    return nearest;
  }

  private normalizeToken(token: string): string[] {
    const normalized = token.normalize("NFKC").trim().toLowerCase();
    const characters = Array.from(normalized);
    if (characters.length > this.maxTokenLength) {
      throw new GtedError("token_too_large");
    }

    return characters;
  }

  private createMatrix(rows: number, columns: number): number[][] {
    return Array.from({ length: rows }, () => Array(columns).fill(0) as number[]);
  }

  private substitutionCost(left: string, right: string): number {
    if (left === right) {
      return 0;
    }

    if (this.visualNeighbors.get(left)?.has(right) === true) {
      return VISUAL_SUBSTITUTION_COST;
    }

    if (this.keyboardNeighbors.get(left)?.has(right) === true) {
      return GRAPH_NEIGHBOR_SUBSTITUTION_COST;
    }

    return DEFAULT_SUBSTITUTION_COST;
  }
}

function buildKeyboardNeighborMap(): ReadonlyMap<string, ReadonlySet<string>> {
  const pairs: [string, string][] = [];

  for (const row of KEYBOARD_ROWS) {
    for (let index = 0; index < row.length - 1; index += 1) {
      pairs.push([row[index], row[index + 1]]);
    }
  }

  return buildPairMap(pairs);
}

function buildPairMap(
  pairs: readonly (readonly [string, string])[],
): ReadonlyMap<string, ReadonlySet<string>> {
  const map = new Map<string, Set<string>>();
  for (const [left, right] of pairs) {
    addPair(map, left, right);
    addPair(map, right, left);
  }

  return map;
}

function addPair(map: Map<string, Set<string>>, left: string, right: string): void {
  const existing = map.get(left);
  if (existing !== undefined) {
    existing.add(right);
    return;
  }

  map.set(left, new Set([right]));
}

function roundDistance(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
