import { Injectable } from "@nestjs/common";

export const DEFAULT_PREVIEW_BUDGET_LIMIT = 100;

export interface PreviewBudgetResult {
  readonly control: "DENY" | "PASS";
  readonly reason: "preview_consumed" | "preview_exhausted";
  readonly remaining: number;
}

interface PreviewBudgetState {
  remaining: number;
}

@Injectable()
export class PreviewBudgetService {
  private readonly budgets = new Map<string, PreviewBudgetState>();

  ensureBudget(
    sessionId: string,
    limit: number = readPreviewBudgetLimit(),
  ): PreviewBudgetState {
    const existing = this.budgets.get(sessionId);
    if (existing !== undefined) {
      return existing;
    }

    const budget = { remaining: normalizeLimit(limit) };
    this.budgets.set(sessionId, budget);
    return budget;
  }

  consume(
    sessionId: string,
    limit: number = readPreviewBudgetLimit(),
  ): PreviewBudgetResult {
    const budget = this.ensureBudget(sessionId, limit);
    if (budget.remaining <= 0) {
      return {
        control: "DENY",
        reason: "preview_exhausted",
        remaining: 0,
      };
    }

    budget.remaining -= 1;
    return {
      control: "PASS",
      reason: "preview_consumed",
      remaining: budget.remaining,
    };
  }

  reset(sessionId?: string): void {
    if (sessionId === undefined) {
      this.budgets.clear();
      return;
    }

    this.budgets.delete(sessionId);
  }
}

function readPreviewBudgetLimit(): number {
  const raw = process.env.COESITE_PREVIEW_BUDGET_LIMIT;
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_PREVIEW_BUDGET_LIMIT;
  }

  return normalizeLimit(Number(raw));
}

function normalizeLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 10_000) {
    throw new Error("COESITE_PREVIEW_BUDGET_LIMIT_invalid");
  }

  return value;
}
