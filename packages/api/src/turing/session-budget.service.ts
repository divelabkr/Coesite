import { Injectable } from "@nestjs/common";

export interface SessionBudgetCreateInput {
  readonly sessionId: string;
  readonly budget: number;
  readonly expiresAt: Date;
}

export interface SessionBudgetResult {
  readonly control: "DENY" | "PASS";
  readonly reason:
    | "budget_consumed"
    | "budget_exhausted"
    | "expired_session"
    | "invalid_amount"
    | "missing_session";
  readonly remaining: number;
}

interface SessionBudgetState {
  readonly expiresAt: Date;
  remaining: number;
}

@Injectable()
export class SessionBudgetService {
  private readonly sessions = new Map<string, SessionBudgetState>();

  createSession(input: SessionBudgetCreateInput): void {
    this.sessions.set(input.sessionId, {
      expiresAt: input.expiresAt,
      remaining: Math.max(0, input.budget),
    });
  }

  ensureSession(input: SessionBudgetCreateInput): void {
    if (this.sessions.has(input.sessionId)) {
      return;
    }

    this.createSession(input);
  }

  consume(
    sessionId: string,
    amount: number,
    at: Date = new Date(),
  ): SessionBudgetResult {
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        control: "DENY",
        reason: "invalid_amount",
        remaining: 0,
      };
    }

    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      return {
        control: "DENY",
        reason: "missing_session",
        remaining: 0,
      };
    }

    if (session.expiresAt.getTime() <= at.getTime()) {
      return {
        control: "DENY",
        reason: "expired_session",
        remaining: session.remaining,
      };
    }

    if (session.remaining < amount) {
      return {
        control: "DENY",
        reason: "budget_exhausted",
        remaining: session.remaining,
      };
    }

    session.remaining -= amount;
    return {
      control: "PASS",
      reason: "budget_consumed",
      remaining: session.remaining,
    };
  }
}
