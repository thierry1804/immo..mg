export const SOURCE_LABEL: Record<string, string> = {
  user: "Utilisateur",
  bazary: "Bazary",
  jovenna: "Jovenna",
  lacoteimmobiliere: "La Côte Immobilière",
  coinafrique: "CoinAfrique",
  "coinafrique-villas": "CoinAfrique Villas",
  ofim: "OFIM",
  acropole: "Acropole Immo",
  etrano: "e-trano",
  facebook: "Facebook",
};

export const PROPERTY_LABEL: Record<string, string> = {
  house: "Maison",
  apartment: "Appartement",
  land: "Terrain",
  commercial: "Commercial",
  other: "Autre",
};

export function sourceLabel(slug: string): string {
  return SOURCE_LABEL[slug] ?? slug;
}
