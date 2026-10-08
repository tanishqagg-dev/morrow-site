import { describe, expect, it } from "vitest";
import { billingQuote, firstPaymentQuote } from "../lib/billing";
describe("tax-inclusive billing quote", () => {
  it("charges exactly ten rupees including GST", () => {
    expect(billingQuote(847, 1, 1000)).toEqual({base:847,gst:153,total:1000});
    expect(billingQuote(847, 2, 1000)).toEqual({base:1694,gst:306,total:2000});
  });
  it("preserves legacy and coupon quotes", () => {
    expect(billingQuote(299900)).toEqual({base:299900,gst:53982,total:353882});
    expect(billingQuote(0)).toEqual({base:0,gst:0,total:0});
  });
});

it("uses the aggregate first payment once for multiple seats and extracts included GST", () => {
  expect(firstPaymentQuote(966098)).toEqual({base:818727,gst:147371,total:966098});
  expect(firstPaymentQuote(100)).toEqual({base:85,gst:15,total:100});
});
