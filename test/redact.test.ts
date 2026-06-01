import { describe, expect, it } from "vitest";
import { isSecretLikeKey, redactValue } from "../src/utils/redact.js";

describe("redaction", () => {
  it("detects secret-looking env keys", () => {
    expect(isSecretLikeKey("NPM_TOKEN")).toBe(true);
    expect(isSecretLikeKey("PUBLIC_URL")).toBe(false);
  });

  it("redacts secret-looking values", () => {
    expect(redactValue("NPM_TOKEN", "abc")).toBe("[redacted]");
  });
});
