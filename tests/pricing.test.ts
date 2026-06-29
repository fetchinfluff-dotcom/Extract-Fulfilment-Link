import { describe, expect, it } from "vitest";
import { calculatePricing, roundPrice } from "@listingforge/pricing";

describe("pricing engine", () => {
  it("uses landed cost multipliers and upward .99 rounding", () => {
    const result = calculatePricing({ itemCost: 8, shippingCost: 4, roundingStyle: "up_99" });
    expect(result.landedCost).toBe(12);
    expect(result.lowPrice).toBe(36.99);
    expect(result.recommendedPrice).toBe(48.99);
    expect(result.highPrice).toBe(60.99);
  });

  it("never rounds below target", () => {
    expect(roundPrice(48.01, "up_99")).toBe(48.99);
    expect(roundPrice(48.991, "up_99")).toBe(49.99);
  });
});
