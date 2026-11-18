/** Money is stored as integer paise; shown as ₹ with Indian digit grouping (₹12,34,567). */

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(paise: number): string {
  return INR.format(Math.round(paise / 100));
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}
