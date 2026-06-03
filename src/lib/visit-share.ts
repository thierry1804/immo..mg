import { formatPrice } from "@/lib/format";

export function whatsAppVisitUrl(input: {
  title: string;
  price: number;
  transactionType: "sale" | "rent";
  listingUrl: string;
}): string {
  const price = formatPrice(input.price, input.transactionType);
  const text = `Bonjour, je souhaite planifier une visite pour : ${input.title} (${price}). ${input.listingUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function shareListing(input: {
  title: string;
  url: string;
}): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: input.title,
        text: input.title,
        url: input.url,
      });
      return true;
    } catch {
      return false;
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(input.url);
    return true;
  }
  return false;
}

export function formatLastSeen(iso: string | null): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (86400 * 1000));
  if (days < 1) return "Mis à jour aujourd'hui";
  if (days === 1) return "Mis à jour hier";
  if (days < 30) return `Mis à jour il y a ${days} j`;
  const months = Math.floor(days / 30);
  return `Mis à jour il y a ${months} mois`;
}
