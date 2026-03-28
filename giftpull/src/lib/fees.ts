const BASE_FEE_RATE = 0.03; // 3%
const PORTAL_FEE_DISCOUNT = 0.5; // 50% off fees

/**
 * Calculate the transaction fee for storefront and P2P purchases.
 * PORTAL users pay 1.5% instead of 3%.
 */
export function calculateFee(
  amount: number,
  paymentMethod: string
): { fee: number; total: number; feeRate: number } {
  const feeRate =
    paymentMethod === "PORTAL"
      ? BASE_FEE_RATE * (1 - PORTAL_FEE_DISCOUNT)
      : BASE_FEE_RATE;
  const fee = Math.round(amount * feeRate * 100) / 100;
  const total = Math.round((amount + fee) * 100) / 100;
  return { fee, total, feeRate };
}

/**
 * Apply gacha discount for PORTAL users (5% off pull price).
 * Non-PORTAL users pay full price. Gacha has no fee.
 */
export function calculateGachaDiscount(
  price: number,
  paymentMethod: string
): number {
  if (paymentMethod === "PORTAL") {
    return Math.round(price * 0.95 * 100) / 100;
  }
  return price;
}
