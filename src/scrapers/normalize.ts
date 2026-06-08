import crypto from "node:crypto";
import { extractAmenities } from "@/lib/amenities";
import { resolveListingLocation } from "@/lib/listing-location";
import type {
  NormalizedListing,
  PropertyType,
  RawListing,
  TransactionType,
} from "./types";

const PROPERTY_KEYWORDS: Array<[PropertyType, RegExp]> = [
  ["apartment", /appart|t\d{1,2}\b|studio/i],
  ["house", /maison|villa|bungalow/i],
  ["land", /terrain|parcelle/i],
  ["commercial", /local|commerce|bureau|boutique/i],
];

const TRANSACTION_KEYWORDS: Array<[TransactionType, RegExp]> = [
  ["rent", /loc(at|ation)|à louer|a louer|à\s*louer/i],
  ["sale", /vente|à vendre|a vendre/i],
];

function pickPropertyType(text: string): PropertyType {
  for (const [type, re] of PROPERTY_KEYWORDS) {
    if (re.test(text)) return type;
  }
  return "other";
}

function pickTransactionType(text: string): TransactionType {
  for (const [type, re] of TRANSACTION_KEYWORDS) {
    if (re.test(text)) return type;
  }
  return "sale";
}

export function parsePriceAriary(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.replace(/[.\s]/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function parseSurface(raw: string | null): number {
  if (!raw) return 0;
  const m = /(\d+)\s*m/.exec(raw);
  return m ? Number(m[1]) : 0;
}

export function parseRooms(raw: string | null): number {
  if (!raw) return 0;
  const m = /(\d+)/.exec(raw);
  return m ? Number(m[1]) : 0;
}

function hashRawListing(raw: RawListing): string {
  return crypto
    .createHash("md5")
    .update(
      JSON.stringify({
        title: raw.title,
        description: raw.description,
        price: raw.rawPrice,
        address: raw.rawAddress,
        images: raw.imageUrls,
      }),
    )
    .digest("hex");
}

export async function normalizeListing(
  raw: RawListing,
): Promise<NormalizedListing | null> {
  const haystack = `${raw.title} ${raw.description} ${raw.rawType} ${raw.rawTransaction}`;
  const propertyType = pickPropertyType(haystack);
  const transactionType = pickTransactionType(haystack);
  const price = parsePriceAriary(raw.rawPrice);
  if (price <= 0) return null;

  const surface = parseSurface(raw.rawSurface);
  const rooms = parseRooms(raw.rawRooms);

  const located = await resolveListingLocation({
    title: raw.title,
    description: raw.description,
    address: raw.rawAddress,
  });
  if (!located) return null;

  const amenities = extractAmenities(`${raw.title} ${raw.description}`);

  return {
    source: raw.source,
    externalId: raw.externalId,
    externalUrl: raw.externalUrl,
    title: raw.title.trim().slice(0, 200),
    description: raw.description.trim().slice(0, 5000) || raw.title,
    price,
    transactionType,
    propertyType,
    address: located.address,
    lng: located.lng,
    lat: located.lat,
    surfaceM2: surface || 1,
    rooms: rooms || 0,
    imageUrls: raw.imageUrls.slice(0, 20),
    rawHash: hashRawListing(raw),
    amenities,
    fokontany: located.fokontany,
    geoConfidence: located.confidence,
    geoSource: located.source,
  };
}
