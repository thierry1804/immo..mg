/**
 * Référentiel des grandes villes / chefs-lieux de Madagascar.
 *
 * Sert à géocoder les annonces hors d'Antananarivo : sans ce gazetteer, tout le
 * pipeline retombait sur « …, Antananarivo » et ramenait les biens de province
 * vers Tana. On détecte la ville citée, on scope le géocodage dessus, et à
 * défaut on positionne au centre de la ville plutôt que sur la capitale.
 *
 * Antananarivo y figure aussi (gazetteer complet), mais le pipeline garde sa
 * logique quartiers (FOKONTANY) pour Tana et ne traite ce repli ville que pour
 * les autres villes.
 */
export type CityMg = {
  name: string;
  lng: number;
  lat: number;
  /** Variantes / noms historiques (sans accents requis). */
  aliases: string[];
};

export const CITIES_MG: CityMg[] = [
  { name: "Antananarivo", lng: 47.5079, lat: -18.8792, aliases: ["tananarive", "tana"] },
  { name: "Toamasina", lng: 49.4023, lat: -18.1492, aliases: ["tamatave"] },
  { name: "Mahajanga", lng: 46.3167, lat: -15.7167, aliases: ["majunga"] },
  { name: "Fianarantsoa", lng: 47.0833, lat: -21.4536, aliases: ["fianara"] },
  { name: "Toliara", lng: 43.6675, lat: -23.35, aliases: ["tulear", "tuléar", "toliary"] },
  { name: "Antsiranana", lng: 49.2917, lat: -12.2766, aliases: ["diego suarez", "diego-suarez", "diego"] },
  { name: "Antsirabe", lng: 47.0333, lat: -19.8667, aliases: [] },
  { name: "Nosy Be", lng: 48.2667, lat: -13.4, aliases: ["nossi-be", "andoany", "hell-ville", "hell ville"] },
  { name: "Morondava", lng: 44.2833, lat: -20.2833, aliases: [] },
  { name: "Taolagnaro", lng: 46.9833, lat: -25.0333, aliases: ["fort-dauphin", "fort dauphin", "tolagnaro"] },
  { name: "Sambava", lng: 50.1667, lat: -14.2667, aliases: [] },
  { name: "Manakara", lng: 48.0167, lat: -22.15, aliases: [] },
  { name: "Ambositra", lng: 47.25, lat: -20.53, aliases: [] },
  { name: "Antalaha", lng: 50.2833, lat: -14.9, aliases: [] },
  { name: "Maroantsetra", lng: 49.75, lat: -15.4333, aliases: [] },
  { name: "Moramanga", lng: 48.2, lat: -18.9333, aliases: [] },
  { name: "Ambatondrazaka", lng: 48.4167, lat: -17.8333, aliases: [] },
  { name: "Fenoarivo Atsinanana", lng: 49.4167, lat: -17.3833, aliases: ["fenerive-est", "fénérive-est", "fenerive est"] },
  { name: "Mahavelona", lng: 49.5, lat: -17.6833, aliases: ["foulpointe"] },
  { name: "Maevatanana", lng: 46.8333, lat: -16.95, aliases: [] },
  { name: "Ihosy", lng: 46.1167, lat: -22.4, aliases: [] },
  { name: "Tsiroanomandidy", lng: 46.05, lat: -18.7667, aliases: [] },
  { name: "Manjakandriana", lng: 47.8, lat: -18.9167, aliases: [] },
  { name: "Andasibe", lng: 48.4167, lat: -18.9333, aliases: [] },
];

function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Ville malgache citée dans le texte (nom ou alias), correspondance la plus
 * longue, ancrée sur des frontières de mots pour éviter les sous-chaînes.
 */
export function matchCityMg(text: string): CityMg | null {
  const folded = fold(text);
  let best: { city: CityMg; len: number } | null = null;
  for (const city of CITIES_MG) {
    for (const key of [city.name, ...city.aliases].map(fold)) {
      if (key.length < 4) continue;
      const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(key)}(?:$|[^a-z0-9])`);
      if (!re.test(folded)) continue;
      if (!best || key.length > best.len) best = { city, len: key.length };
    }
  }
  return best?.city ?? null;
}

/**
 * Vrai si la phrase ne désigne qu'une ville (sans quartier / sous-zone) — un
 * tel résultat est moins précis qu'un point de quartier, d'où une confiance
 * géo plus basse.
 */
export function isBareCityName(phrase: string): boolean {
  const city = matchCityMg(phrase);
  if (!city) return false;
  let rest = fold(phrase);
  for (const key of [city.name, ...city.aliases]) {
    rest = rest.split(fold(key)).join(" ");
  }
  return rest.replace(/[^a-z0-9]/g, "").length < 3;
}

/** Viewbox Nominatim « lonMin,latMin,lonMax,latMax » autour du centre ville. */
export function cityViewbox(city: CityMg, delta = 0.12): string {
  return [
    (city.lng - delta).toFixed(4),
    (city.lat - delta).toFixed(4),
    (city.lng + delta).toFixed(4),
    (city.lat + delta).toFixed(4),
  ].join(",");
}
