import { FOKONTANY, matchFokontanyByName, resolveFokontany } from "@/lib/fokontany";
import {
  extractProximityTarget,
  isNearIvatoAirport,
  LANDMARKS,
  matchLandmark,
  mentionsAirport,
  type Landmark,
} from "@/lib/landmarks";
import { geocode } from "@/scrapers/geocode";

export type ListingLocationInput = {
  title: string;
  description?: string | null;
  address: string;
};

export type ResolvedListingLocation = {
  lng: number;
  lat: number;
  fokontany: string | null;
  address: string;
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

function fromLandmark(
  lm: Landmark,
  phrase: string | null,
  text: string,
): ResolvedListingLocation {
  const area = areaLabelFromText(phrase, text, lm.fokontany);
  const address = `${area}, près de ${lm.name}, Antananarivo`;
  return {
    lng: lm.lng,
    lat: lm.lat,
    fokontany: lm.fokontany,
    address: address.slice(0, 500),
  };
}

function fromCoord(
  coord: { lng: number; lat: number },
  opts: {
    phrase?: string | null;
    text: string;
    address: string;
  },
): ResolvedListingLocation {
  const fokontany =
    matchFokontanyByName(opts.text) ?? resolveFokontany(coord.lng, coord.lat);
  const displayAddress = opts.phrase
    ? `${opts.phrase}, Antananarivo`
    : fokontany
      ? `${fokontany}, Antananarivo`
      : opts.address;
  return {
    lng: coord.lng,
    lat: coord.lat,
    fokontany,
    address: displayAddress.slice(0, 500),
  };
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

  const nearTarget = extractProximityTarget(text);
  if (nearTarget) {
    const lmFromNear = matchLandmark(nearTarget) ?? matchLandmark(text);
    if (lmFromNear) {
      return fromLandmark(lmFromNear, phrase, text);
    }
    const nearCoord = await geocode(buildGeocodeQuery(`${nearTarget}, Antananarivo`));
    if (nearCoord && !shouldRejectAirportCoord(nearCoord, text)) {
      return fromCoord(nearCoord, { phrase: nearTarget, text, address });
    }
  }

  const landmark = matchLandmark(text);
  if (landmark) {
    return fromLandmark(landmark, phrase, text);
  }

  const preciseQuery = buildPreciseGeocodeQuery(title, description, phrase);
  const queries: string[] = [];
  if (preciseQuery) queries.push(preciseQuery);
  if (phrase && !queries.includes(buildGeocodeQuery(phrase))) {
    queries.push(buildGeocodeQuery(phrase));
  }
  if (!isGenericAddress(address)) {
    queries.push(buildGeocodeQuery(address));
  }

  for (const q of queries) {
    const coord = await geocode(q);
    if (!coord || shouldRejectAirportCoord(coord, text)) continue;
    return fromCoord(coord, { phrase, text, address });
  }

  const fokName = matchFokontanyByName(text);
  if (fokName) {
    if (fokName === "Ivato" && /antanetibe/i.test(text)) {
      const ant = fokontanyCentroid("Antanetibe");
      return {
        ...ant,
        fokontany: "Antanetibe",
        address: `${phrase ?? "Antanetibe Ivato"}, Antananarivo`,
      };
    }
    const { lng, lat } = fokontanyCentroid(fokName);
    if (isNearIvatoAirport(lng, lat) && !mentionsAirport(text)) {
      const antLm = LANDMARKS.find((l) => l.fokontany === "Antanetibe");
      if (antLm && /antanetibe|ivato/i.test(text)) {
        return fromLandmark(antLm, phrase, text);
      }
    }
    return {
      lng,
      lat,
      fokontany: fokName,
      address: `${phrase ?? fokName}, Antananarivo`,
    };
  }

  return null;
}
