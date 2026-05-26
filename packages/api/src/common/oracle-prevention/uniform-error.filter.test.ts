import {
  UnprocessableEntityException,
  type ArgumentsHost,
} from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OraclePreventionService } from "./oracle-prevention.service";
import { UniformErrorFilter } from "./uniform-error.filter";
import type { OracleHttpResponse } from "./types";

function createHost(response: OracleHttpResponse): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: "/validation" }),
    }),
  } as unknown as ArgumentsHost;
}

describe("UniformErrorFilter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records original exception metadata internally without changing the external response", async () => {
    const padAndReject = vi.fn().mockResolvedValue(undefined);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = {} as OracleHttpResponse;
    const filter = new UniformErrorFilter({
      padAndReject,
    } as unknown as OraclePreventionService);

    await filter.catch(
      new UnprocessableEntityException("invalid payload"),
      createHost(response),
    );

    expect(padAndReject).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        source: "exception",
        statusCode: 422,
        reason: "UnprocessableEntityException",
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "oracle-prevention exception",
      expect.objectContaining({
        name: "UnprocessableEntityException",
        path: "/validation",
        stackPresent: true,
        statusCode: 422,
      }),
    );
  });

  it("redacts attacker-controlled query strings and exception messages from logs", async () => {
    const padAndReject = vi.fn().mockResolvedValue(undefined);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = {} as OracleHttpResponse;
    const filter = new UniformErrorFilter({
      padAndReject,
    } as unknown as OraclePreventionService);

    await filter.catch(
      new Error("token=secret-value"),
      {
        switchToHttp: () => ({
          getResponse: () => response,
          getRequest: () => ({ url: "/validation?token=secret-value" }),
        }),
      } as unknown as ArgumentsHost,
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "oracle-prevention exception",
      expect.objectContaining({
        message: "redacted",
        path: "/validation",
      }),
    );
  });
});
