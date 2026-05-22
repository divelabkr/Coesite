import { describe, expect, it } from "vitest";

import { TokenNormService } from "./token-norm.service";

describe("TokenNormService", () => {
  const service = new TokenNormService();

  it("leaves plain ascii strings unchanged", () => {
    const result = service.normalize("plain-token");

    expect(result.value).toBe("plain-token");
    expect(result.findings).toHaveLength(0);
  });

  it("leaves numbers unchanged", () => {
    const result = service.normalize(42);

    expect(result.value).toBe(42);
    expect(result.findings).toHaveLength(0);
  });

  it("leaves booleans unchanged", () => {
    const result = service.normalize(false);

    expect(result.value).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it("leaves null unchanged", () => {
    const result = service.normalize(null);

    expect(result.value).toBeNull();
    expect(result.findings).toHaveLength(0);
  });

  it("normalizes Unicode NFKC full-width characters", () => {
    const result = service.normalize("ＡＢＣ９８７");

    expect(result.value).toBe("ABC987");
    expect(result.findings).toEqual([
      {
        path: "$",
        reason: "unicode_nfkc",
        original: "ＡＢＣ９８７",
        normalized: "ABC987",
      },
    ]);
  });

  it("removes zero-width space", () => {
    const result = service.normalize("pay\u200Bload");

    expect(result.value).toBe("payload");
    expect(result.findings[0]?.reason).toBe("zero_width");
  });

  it("removes zero-width non-joiner", () => {
    const result = service.normalize("pay\u200Cload");

    expect(result.value).toBe("payload");
    expect(result.findings[0]?.reason).toBe("zero_width");
  });

  it("removes zero-width joiner", () => {
    const result = service.normalize("pay\u200Dload");

    expect(result.value).toBe("payload");
    expect(result.findings[0]?.reason).toBe("zero_width");
  });

  it("removes byte-order mark", () => {
    const result = service.normalize("\uFEFFpayload");

    expect(result.value).toBe("payload");
    expect(result.findings[0]?.reason).toBe("zero_width");
  });

  it("removes bidi controls", () => {
    const result = service.normalize("abc\u202Edef");

    expect(result.value).toBe("abcdef");
    expect(result.findings[0]?.reason).toBe("bidi_control");
  });

  it("maps Cyrillic small a to Latin a", () => {
    const result = service.normalize("p\u0430yload");

    expect(result.value).toBe("payload");
    expect(result.findings[0]?.reason).toBe("homoglyph");
  });

  it("maps Cyrillic capital letters to Latin letters", () => {
    const result = service.normalize("\u0420\u0410\u0423");

    expect(result.value).toBe("PAY");
    expect(result.findings[0]?.reason).toBe("homoglyph");
  });

  it("decodes URL encoding once", () => {
    const result = service.normalize("%2Fadmin%2Fpanel");

    expect(result.value).toBe("/admin/panel");
    expect(result.findings[0]?.reason).toBe("url_decode");
  });

  it("decodes URL encoding twice and records double encoding", () => {
    const result = service.normalize("%252Fadmin");

    expect(result.value).toBe("/admin");
    expect(result.findings[0]?.reason).toBe("double_url_decode");
  });

  it("fails closed on malformed URL encoding", () => {
    const result = service.normalize("%E0%A4%A");

    expect(result.value).toBe("%E0%A4%A");
    expect(result.findings[0]?.reason).toBe("malformed_url");
  });

  it("decodes base64 payloads", () => {
    const result = service.normalize("cGF5bG9hZA==");

    expect(result.value).toBe("payload");
    expect(result.findings[0]?.reason).toBe("base64");
  });

  it("does not decode short base64-like words", () => {
    const result = service.normalize("test");

    expect(result.value).toBe("test");
    expect(result.findings).toHaveLength(0);
  });

  it("normalizes arrays recursively", () => {
    const result = service.normalize(["safe", "p\u0430y"]);

    expect(result.value).toEqual(["safe", "pay"]);
    expect(result.findings[0]?.path).toBe("$[1]");
  });

  it("normalizes nested object values recursively", () => {
    const result = service.normalize({ input: { token: "pay\u200Bload" } });

    expect(result.value).toEqual({ input: { token: "payload" } });
    expect(result.findings[0]?.path).toBe("$.input.token");
  });

  it("normalizes object keys recursively", () => {
    const result = service.normalize({ "t\u043Eken": "value" });

    expect(result.value).toEqual({ token: "value" });
    expect(result.findings[0]?.path).toBe("$.{key:t\u043Eken}");
  });

  it("records multiple transforms for one value in order", () => {
    const result = service.normalize("pay\u200Bl\u043Ead");

    expect(result.value).toBe("payload");
    expect(result.findings.map((finding) => finding.reason)).toEqual([
      "zero_width",
      "homoglyph",
    ]);
  });

  it("keeps class instances unchanged", () => {
    class Holder {
      constructor(readonly value: string) {}
    }
    const holder = new Holder("pay\u200Bload");
    const result = service.normalize(holder);

    expect(result.value).toBe(holder);
    expect(result.findings).toHaveLength(0);
  });

  it.each([
    ["URL to Cyrillic", "%D1%80ay"],
    ["base64 to URL", "JTJGcGF5bG9hZA=="],
    ["double base64", "Y0dGNWJHOWhaQT09"],
    ["NFKC to bidi", "%EF%BC%9Cscript%EF%BC%9E%E2%80%AE"],
    ["double URL to zero width", "%2570ay%25E2%2580%258Bload"],
    ["URL to base64", "cGF5JUUyJTgwJThCbG9hZA=="],
    ["base64 to homoglyph", "cNGAeQ=="],
    ["mixed full width", "%EF%BC%A1%EF%BC%A2%EF%BC%A3"],
    ["bidi inside URL", "abc%E2%80%AEdef"],
    ["zero width inside base64", "cGF54oCLbG9hZA=="],
    ["double URL path", "%252Fadmin%252Fpanel"],
    ["URL encoded base64 payload", "Y0dGNUl1T0tnbVhPa0E9PQ%3D%3D"],
    ["base64 to Cyrillic", "0LBhZA=="],
    ["NFKC key marker", "%EF%BC%8Fadmin"],
    ["URL lower hex", "%2fadmin"],
    ["URL mixed hex", "%2Fadmin%2fpanel"],
    ["nested encoded percent", "%2525"],
    ["encoded bidi wrapper", "%E2%81%A6abc%E2%81%A9"],
    ["encoded byte order mark", "%EF%BB%BFpayload"],
    ["base64 url alphabet", "cGF5bG9hZC0_"],
  ])("detects fixed-point attack vector: %s", (_name, input) => {
    const result = service.normalize(input);

    expect(result.findings.length).toBeGreaterThan(0);
  });

  it.each(["%252Fadmin%ZZ", "%2", "%"])(
    "fails closed on malformed URL variant %s",
    (input) => {
      const result = service.normalize(input);

      expect(result.findings[0]?.reason).toBe("malformed_url");
    },
  );

  it("caps recursive normalization depth", () => {
    const result = service.normalize({
      a: { b: { c: { d: "pay\u200Bload" } } },
    });

    expect(result.findings[0]?.reason).toBe("max_depth_exceeded");
  });

  it("fails closed when string input exceeds the DoS cap", () => {
    const result = service.normalize("a".repeat(65_537));

    expect(result.findings[0]?.reason).toBe("base64_expansion");
  });
});
