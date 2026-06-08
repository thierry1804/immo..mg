import { FOKONTANY, matchFokontanyByName, resolveFokontany } from "@/lib/fokontany";
import {
  extractProximityTarget,
  isNearIvatoAirport,
  LANDMARKS,
  matchLandmark,
  mentionsAirport,
  type Landmark,
} from "@/lib/landmarks";
import { cityViewbox, isBareCityName, matchCityMg } from "@/lib/places-mg";
import { geocode } from "@/scrapers/geocode";

export type ListingLocationInput = {
  title: string;
  description?: string | null;
  address: string;
};

/** Niveau de précision du géocodage → confiance affichée en modération. */
export type GeoPrecision =
  | "landmark"
  | "proximity"
  | "neighborhood"
  | "city"
  | "region";

const PRECISION: Record<GeoPrecision, { confidence: number; source: string }> = {
  landmark: { confidence: 92, source: "Repère localisé" },
  proximity: { confidence: 80, source: "Proximité d'un lieu nommé" },
  neighborhood: { confidence: 70, source: "Quartier reconnu" },
  city: { confidence: 50, source: "Ville seule — point approximatif" },
  region: { confidence: 35, source: "Zone large — point approximatif" },
};

export type ResolvedListingLocation = {
  lng: number;
  lat: number;
  fokontany: string | null;
  address: string;
  /** Confiance du géocodage 0–100. */
  confidence: number;
  /** Libellé lisible de la méthode de résolution. */
  source: string;
};

const GENERIC_ADDRESS =
  /^(antananarivo|tananarive)(\s*\([^)]*\))?(\s*,?\s*madagascar)?$/i;

/** Décodage minimal des entités HTML dans les titres RSS (OFIM, etc.). */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Extrait un lieu précis depuis le titre ou la description (scrapers type OFIM). */
export function extractLocationPhrase(
  title: string,
  description?: string | null,
): string | null {
  const sources = [
    decodeHtmlEntities(title),
    description ? decodeHtmlEntities(description) : "",
  ].filter(Boolean);
  const patterns = [
    /(?:à|a|située?\s+à|situé\s+à|dans)\s+([A-Za-zÀ-ÿ0-9''\-\s]+?)(?:\s+près de|\s+proche|\s+(?:Antananarivo|Tananarive)|,|\.|$)/i,
    /(?:quartier|zone|secteur)\s+([A-Za-zÀ-ÿ0-9''\-\s]+?)(?:\s|,|\.|$)/i,
  ];

  for (const text of sources) {
    for (const re of patterns) {
      const m = re.exec(text);
      if (!m?.[1]) continue;
      const phrase = m[1].trim().replace(/\s+/g, " ");
      if (phrase.length < 3 || GENERIC_ADDRESS.test(phrase)) continue;
      return phrase;
    }
  }
  return null;
}

// Fragments de mesure à retirer du suffixe de titre (« 4 pièces », « 300 m² »…).
const MEASURE_NOISE =
  /\b\d+(?:[.,]\d+)?\s*(?:pièces?|pcs|chambres?|m²|m2|ha|are?s?)\b/gi;

/**
 * Beaucoup d'annonces (CoinAfrique) portent leur ville/quartier dans le suffixe
 * du titre : « Vente villas 6 pièces - Toamasina », « Location villa - Nanisana ».
 * On extrait ce segment (après le dernier « - ») comme lieu le plus fiable,
 * géocodable à l'échelle de tout Madagascar (et pas seulement Antananarivo).
 */
export function extractTitlePlace(title: string): string | null {
  const t = decodeHtmlEntities(title);
  const parts = t.split(/\s+-\s+/);
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1]
    .replace(MEASURE_NOISE, "")
    .replace(/\s+/g, " ")
    .trim();
  if (last.length < 3 || last.length > 40) return null;
  if (/^madagascar$/i.test(last)) return null;
  if (GENERIC_ADDRESS.test(last)) return null; // « Antananarivo » seul → géré ailleurs
  if (!/[a-zà-ÿ]{3,}/i.test(last)) return null; // doit contenir un vrai nom de lieu
  return last;
}

function fokontanyCentroid(name: string): { lng: number; lat: number } {
  const f = FOKONTANY.find((n) => n.name === name);
  if (!f) throw new Error(`Unknown fokontany: ${name}`);
  return { lng: f.lng, lat: f.lat };
}

function buildGeocodeQuery(phrase: string): string {
  if (/madagascar/i.test(phrase)) return phrase;
  if (/antananarivo|tananarive/i.test(phrase)) return `${phrase}, Madagascar`;
  return `${phrase}, Antananarivo, Madagascar`;
}

function isGenericAddress(address: string): boolean {
  const t = address.trim();
  return !t || GENERIC_ADDRESS.test(t);
}

function areaLabelFromText(
  phrase: string | null,
  text: string,
  fallback: string,
): string {
  if (phrase) {
    const cut = phrase.split(/\s+près de\s+/i)[0]?.trim();
    if (cut && cut.length >= 3 && cut.length < 80) return cut;
  }
  return matchFokontanyByName(text) ?? fallback;
}

function withConf(
  base: { lng: number; lat: number; fokontany: string | null; address: string },
  precision: GeoPrecision,
): ResolvedListingLocation {
  return { ...base, ...PRECISION[precision] };
}

/** Requête Nominatim scopée sur la ville détectée (plus de biais Tana forcé). */
export function buildScopedQuery(phrase: string, cityName: string): string {
  const p = phrase.trim();
  if (/madagascar/i.test(p)) return p;
  if (/antananarivo|tananarive/i.test(p)) return `${p}, Madagascar`;
  return `${p}, ${cityName}, Madagascar`;
}

function fromLandmark(
  lm: Landmark,
  phrase: string | null,
  text: string,
): ResolvedListingLocation {
  const area = areaLabelFromText(phrase, text, lm.fokontany);
  const address = `${area}, près de ${lm.name}, Antananarivo`;
  return withConf(
    {
      lng: lm.lng,
      lat: lm.lat,
      fokontany: lm.fokontany,
      address: address.slice(0, 500),
    },
    "landmark",
  );
}

function fromCoord(
  coord: { lng: number; lat: number },
  opts: {
    phrase?: string | null;
    text: string;
    address: string;
    cityName: string;
    precision: GeoPrecision;
  },
): ResolvedListingLocation {
  const fokontany =
    matchFokontanyByName(opts.text) ?? resolveFokontany(coord.lng, coord.lat);
  const displayAddress = opts.phrase
    ? `${opts.phrase}, ${opts.cityName}`
    : fokontany
      ? `${fokontany}, ${opts.cityName}`
      : opts.address;
  return withConf(
    {
      lng: coord.lng,
      lat: coord.lat,
      fokontany,
      address: displayAddress.slice(0, 500),
    },
    opts.precision,
  );
}

/** Requête Nominatim la plus précise possible à partir du texte annonce. */
export function buildPreciseGeocodeQuery(
  title: string,
  description: string | null,
  phrase: string | null,
): string | null {
  const text = `${title} ${description ?? ""}`;
  const near = extractProximityTarget(text);
  if (near) {
    const lmNear = matchLandmark(near);
    if (lmNear) return `${lmNear.name}, Antanetibe, Ivato, Antananarivo, Madagascar`;
    return buildGeocodeQuery(`${near}, Antananarivo`);
  }

  const lm = matchLandmark(text);
  if (lm) return `${lm.name}, ${lm.fokontany}, Antananarivo, Madagascar`;

  if (phrase) return buildGeocodeQuery(phrase);
  return null;
}

/**
 * Si le géocodeur renvoie la piste d'Ivato alors que l'annonce cite un repère
 * résidentiel, on rejette ce point.
 */
function shouldRejectAirportCoord(
  coord: { lng: number; lat: number },
  text: string,
): boolean {
  if (!isNearIvatoAirport(coord.lng, coord.lat)) return false;
  if (mentionsAirport(text)) return false;
  if (matchLandmark(text)) return true;
  if (/antanetibe|anjomakely|paon/i.test(text)) return true;
  return false;
}

/**
 * Positionne un bien : repères & « près de » → géocodage précis → centroïde quartier.
 */
export async function resolveListingLocation(
  input: ListingLocationInput,
): Promise<ResolvedListingLocation | null> {
  const title = decodeHtmlEntities(input.title);
  const description = input.description
    ? decodeHtmlEntities(input.description)
    : null;
  const address = decodeHtmlEntities(input.address);
  const text = `${title} ${description ?? ""} ${address}`;
  const phrase = extractLocationPhrase(title, description);

  // Ville détectée : hors Antananarivo, on scope le géocodage dessus et on
  // peut retomber sur son centre plutôt que sur la capitale.
  const city = matchCityMg(text);
  const isProvince = Boolean(city) && city!.name !== "Antananarivo";
  const cityName = isProvince ? city!.name : "Antananarivo";
  const cityOpts = isProvince ? { viewbox: cityViewbox(city!) } : {};

  const nearTarget = extractProximityTarget(text);
  if (nearTarget) {
    const lmFromNear = matchLandmark(nearTarget) ?? matchLandmark(text);
    if (lmFromNear) {
      return fromLandmark(lmFromNear, phrase, text);
    }
    const nearCoord = await geocode(
      buildScopedQuery(nearTarget, cityName),
      cityOpts,
    );
    if (nearCoord && !shouldRejectAirportCoord(nearCoord, text)) {
      return fromCoord(nearCoord, {
        phrase: nearTarget,
        text,
        address,
        cityName,
        precision: "proximity",
      });
    }
  }

  const landmark = matchLandmark(text);
  if (landmark) {
    return fromLandmark(landmark, phrase, text);
  }

  // Lieux candidats à géocoder, avec la part « lieu » servant à juger la précision.
  const queries: { q: string; placePart: string }[] = [];
  // Lieu issu du suffixe de titre (ville/quartier) : géocodage Madagascar entier
  // (le plus fiable pour CoinAfrique), contraint au viewbox ville si province.
  const titlePlace = extractTitlePlace(input.title);
  if (titlePlace) {
    queries.push({ q: `${titlePlace}, Madagascar`, placePart: titlePlace });
    // Repli ville : « Toamasina Foulpointe » → « Toamasina ».
    const cityWord = titlePlace.split(/\s+/)[0];
    if (cityWord.length >= 4 && cityWord.toLowerCase() !== titlePlace.toLowerCase()) {
      queries.push({ q: `${cityWord}, Madagascar`, placePart: cityWord });
    }
  }
  // Requête précise (repère/rue Tana) : pertinente seulement hors province.
  if (!isProvince) {
    const preciseQuery = buildPreciseGeocodeQuery(title, description, phrase);
    if (preciseQuery) {
      queries.push({ q: preciseQuery, placePart: phrase ?? preciseQuery });
    }
  }
  if (phrase) {
    const sq = buildScopedQuery(phrase, cityName);
    if (!queries.some((x) => x.q === sq)) queries.push({ q: sq, placePart: phrase });
  }
  if (!isGenericAddress(address)) {
    queries.push({ q: buildScopedQuery(address, cityName), placePart: address });
  }

  for (const { q, placePart } of queries) {
    const coord = await geocode(q, cityOpts);
    if (!coord || shouldRejectAirportCoord(coord, text)) continue;
    const precision: GeoPrecision = isBareCityName(placePart)
      ? "city"
      : "neighborhood";
    return fromCoord(coord, { phrase, text, address, cityName, precision });
  }

  const fokName = matchFokontanyByName(text);
  if (fokName) {
    if (fokName === "Ivato" && /antanetibe/i.test(text)) {
      const ant = fokontanyCentroid("Antanetibe");
      return withConf(
        {
          ...ant,
          fokontany: "Antanetibe",
          address: `${phrase ?? "Antanetibe Ivato"}, Antananarivo`,
        },
        "neighborhood",
      );
    }
    const { lng, lat } = fokontanyCentroid(fokName);
    if (isNearIvatoAirport(lng, lat) && !mentionsAirport(text)) {
      const antLm = LANDMARKS.find((l) => l.fokontany === "Antanetibe");
      if (antLm && /antanetibe|ivato/i.test(text)) {
        return fromLandmark(antLm, phrase, text);
      }
    }
    return withConf(
      {
        lng,
        lat,
        fokontany: fokName,
        address: `${phrase ?? fokName}, Antananarivo`,
      },
      "neighborhood",
    );
  }

  // Repli province : mieux vaut le centre de la ville que Tana — ou que rien.
  if (isProvince) {
    return withConf(
      {
        lng: city!.lng,
        lat: city!.lat,
        fokontany: null,
        address: `${cityName}, Madagascar`,
      },
      "city",
    );
  }

  return null;
}
