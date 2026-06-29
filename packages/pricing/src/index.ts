export type RoundingStyle = "up_99" | "up_95" | "whole" | "premium_00";

export type PricingInput = {
  itemCost: number;
  shippingCost: number;
  handlingCost?: number;
  paymentFeePct?: number;
  paymentFeeFixed?: number;
  refundReservePct?: number;
  adCostPct?: number;
  targetNetMarginPct?: number;
  roundingStyle?: RoundingStyle;
};

export type PricingResult = {
  landedCost: number;
  lowPrice: number;
  recommendedPrice: number;
  highPrice: number;
  targetPrice: number;
  grossProfit: number;
  grossMarginPct: number;
  breakEvenRoas: number;
  warnings: string[];
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function roundPrice(value: number, style: RoundingStyle = "up_99"): number {
  if (style === "whole") return Math.ceil(value);
  if (style === "premium_00") return Math.ceil(value);
  const cents = style === "up_95" ? 0.95 : 0.99;
  const base = Math.floor(value);
  const candidate = base + cents;
  return money(candidate >= value ? candidate : base + 1 + cents);
}

export function calculatePricing(input: PricingInput): PricingResult {
  const landedCost = money(input.itemCost + input.shippingCost + (input.handlingCost ?? 0));
  const lowPrice = roundPrice(landedCost * 3, input.roundingStyle);
  const recommendedPrice = roundPrice(landedCost * 4, input.roundingStyle);
  const highPrice = roundPrice(landedCost * 5, input.roundingStyle);
  const denominator =
    1 -
    (input.paymentFeePct ?? 0.029) -
    (input.refundReservePct ?? 0.05) -
    (input.adCostPct ?? 0.2) -
    (input.targetNetMarginPct ?? 0.2);
  const targetPrice = denominator > 0
    ? roundPrice((landedCost + (input.paymentFeeFixed ?? 0.3)) / denominator, input.roundingStyle)
    : recommendedPrice;
  const grossProfit = money(recommendedPrice - landedCost);
  return {
    landedCost,
    lowPrice,
    recommendedPrice,
    highPrice,
    targetPrice,
    grossProfit,
    grossMarginPct: money(grossProfit / recommendedPrice),
    breakEvenRoas: money(recommendedPrice / Math.max(recommendedPrice - landedCost, 0.01)),
    warnings: input.shippingCost === 0 ? ["Shipping is missing or manually estimated."] : []
  };
}
