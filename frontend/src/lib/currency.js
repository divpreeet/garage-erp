const AED = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

export function formatAED(amount) {
  return AED.format(amount);
}

export const DEFAULT_VAT_RATE = 5;
export const CURRENCY_SYMBOL = "AED";
