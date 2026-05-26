import { afterEach, describe, expect, it, vi } from "vitest";

import { PreviewBudgetService } from "./preview-budget.service";

describe("PreviewBudgetService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("consumes preview budget until it fails closed", () => {
    const service = new PreviewBudgetService();

    expect(service.consume("session-1", 2)).toEqual({
      control: "PASS",
      reason: "preview_consumed",
      remaining: 1,
    });
    expect(service.consume("session-1", 2)).toEqual({
      control: "PASS",
      reason: "preview_consumed",
      remaining: 0,
    });
    expect(service.consume("session-1", 2)).toEqual({
      control: "DENY",
      reason: "preview_exhausted",
      remaining: 0,
    });
  });

  it("rejects invalid configured limits", () => {
    vi.stubEnv("COESITE_PREVIEW_BUDGET_LIMIT", "0");
    const service = new PreviewBudgetService();

    expect(() => service.consume("session-1")).toThrow(
      "COESITE_PREVIEW_BUDGET_LIMIT_invalid",
    );
  });
});
