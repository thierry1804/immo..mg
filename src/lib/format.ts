const ARIARY_FORMAT = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

export function formatPrice(
  amount: number,
  transactionType: "sale" | "rent",
): string {
  const formatted = `${ARIARY_FORMAT.format(amount)} Ar`;
  return transactionType === "rent" ? `${formatted} / mois` : formatted;
}

export function shortPriceLabel(
  amount: number,
  transactionType: "sale" | "rent",
): string {
  let body: string;
  if (amount >= 1_000_000) {
    body = `${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
  } else if (amount >= 1_000) {
    body = `${Math.round(amount / 1_000)}k`;
  } else {
    body = String(amount);
  }
  return transactionType === "rent" ? `${body}Ar/m` : `${body}Ar`;
}
