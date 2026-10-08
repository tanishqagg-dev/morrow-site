import { describe, expect, it } from "vitest";
import { formatActivationCodeInput, normalizeActivationCode } from "../lib/activation-code";

describe("Aestrum activation codes", () => {
  it("formats pasted codes into the canonical five-character groups", () => {
    expect(formatActivationCodeInput("j4u-abcde-fghjk-mnpqr-stuvw")).toBe("J4U-ABCDE-FGHJK-MNPQR-STUVW");
  });

  it("rejects ambiguous and incomplete codes", () => {
    expect(normalizeActivationCode("J4U-ABCDE-FGHJK-MNPQR-STUV0")).toBe("");
    expect(normalizeActivationCode("J4U-ABCDE-FGHJK")).toBe("");
  });

  it("normalizes a valid code", () => {
    expect(normalizeActivationCode("j4u abcde fghjk mnpqr stuvw")).toBe("J4U-ABCDE-FGHJK-MNPQR-STUVW");
  });
});
