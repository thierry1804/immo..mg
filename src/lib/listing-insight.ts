import type { Amenity } from "@/lib/amenities";
import type { CompatibilityResult } from "@/lib/compatibility";
import { formatAriary } from "@/lib/format";
import type { RealCostBreakdown } from "@/lib/real-cost";

export function buildListingInsight(input: {
  title: string;
  fokontany: string | null;
  pricePerSqm: number | null;
  medianPricePerSqm: number | null;
  compatibility: CompatibilityResult | null;
  realCost: RealCostBreakdown | null;
  mustHave: Amenity[];
  amenities: Amenity[];
}): string {
  const parts: string[] = [];
  if (input.fokontany) {
    parts.push(`Bien situé à ${input.fokontany}.`);
  }
  if (
    input.pricePerSqm != null &&
    input.medianPricePerSqm != null &&
    input.medianPricePerSqm > 0
  ) {
    const ratio = input.pricePerSqm / input.medianPricePerSqm;
    if (ratio < 0.92) {
      parts.push(
        `Prix au m² en dessous de la médiane du quartier (${Math.round((1 - ratio) * 100)} %).`,
      );
    } else if (ratio > 1.08) {
      parts.push(`Prix au m² au-dessus de la médiane du quartier.`);
    } else {
      parts.push(`Prix au m² aligné sur le marché local.`);
    }
  }
  if (input.compatibility && input.compatibility.score >= 80) {
    const top = input.compatibility.breakdown
      .filter((b) => b.match >= 0.8)
      .slice(0, 2)
      .map((b) => b.label.toLowerCase());
    if (top.length) {
      parts.push(`Fort alignement avec votre profil (${top.join(", ")}).`);
    }
  }
  const missing = input.mustHave.filter((a) => !input.amenities.includes(a));
  if (missing.length > 0 && input.mustHave.length > 0) {
    parts.push(`Équipements recherchés non confirmés sur cette annonce.`);
  }
  if (input.realCost) {
    parts.push(
      `Coût réel estimé : ${formatAriary(input.realCost.total)} / mois.`,
    );
  }
  if (parts.length === 0) {
    return `Annonce « ${input.title} » — consultez le score de confiance et les sources pour décider.`;
  }
  return parts.slice(0, 3).join(" ");
}
