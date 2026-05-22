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

  it("does not throw on malformed URL encoding", () => {
    const result = service.normalize("%E0%A4%A");

    expect(result.value).toBe("%E0%A4%A");
    expect(result.findings).toHaveLength(0);
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
});
