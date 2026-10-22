// USD is the only currency the video club charges in (decision 2026-10-22),
// so the currency pair is a fixed helper instead of a configurable option.

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/**
 * Formats a money amount as USD with the explicit currency code, e.g.
 * "$14.97 USD", so the operator always knows the currency of the charge.
 */
export function formatUsd(amount: number): string {
  return `${usdFormatter.format(amount)} USD`
}
