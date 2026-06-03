import { z } from "zod";
import { AMENITIES } from "./amenities";

const amenityEnum = z.enum(AMENITIES);

export const credentialsSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(8).max(255),
});
export type CredentialsInput = z.infer<typeof credentialsSchema>;

export const propertyTypeEnum = z.enum([
  "house",
  "apartment",
  "land",
  "commercial",
  "other",
]);
export const transactionTypeEnum = z.enum(["sale", "rent"]);

export const listingInputSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(3).max(5000),
  transactionType: transactionTypeEnum,
  propertyType: propertyTypeEnum,
  price: z.number().int().positive().max(1_000_000_000_000),
  address: z.string().min(3).max(500),
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  surfaceM2: z.number().int().min(1).max(1_000_000),
  rooms: z.number().int().min(0).max(100),
  bedrooms: z.number().int().min(0).max(100).optional().nullable(),
  bathrooms: z.number().int().min(0).max(100).optional().nullable(),
  photoPaths: z
    .array(
      z
        .string()
        .regex(/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/, {
          message: "Invalid upload path",
        }),
    )
    .max(20)
    .default([]),
  amenities: z.array(amenityEnum).max(AMENITIES.length).default([]),
});
export type ListingInput = z.infer<typeof listingInputSchema>;

export const userProfileSchema = z.object({
  budgetMin: z.number().int().positive().max(1_000_000_000_000).nullish(),
  budgetMax: z.number().int().positive().max(1_000_000_000_000).nullish(),
  transactionType: transactionTypeEnum.nullish(),
  quartiers: z.array(z.string().max(100)).max(30).default([]),
  mustHave: z.array(amenityEnum).max(AMENITIES.length).default([]),
  propertyTypes: z.array(propertyTypeEnum).max(5).default([]),
  minSurface: z.number().int().positive().max(1_000_000).nullish(),
  alertThreshold: z.number().int().min(0).max(100).default(80),
});
export type UserProfileInput = z.infer<typeof userProfileSchema>;

export const scrapeSourceInputSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9](-?[a-z0-9])*$/, {
      message: "Slug: lowercase, digits and dashes only",
    }),
  name: z.string().min(2).max(120),
  enabled: z.boolean().default(true),
  baseUrl: z.string().url(),
  listUrls: z.array(z.string().url()).min(1).max(20),
  selectors: z.object({
    card: z.string().min(1),
    link: z.string().min(1),
    title: z.string().min(1),
    price: z.string().min(1),
    address: z.string().min(1),
    image: z.string().optional().nullable(),
  }),
  defaultTransactionType: transactionTypeEnum.optional().nullable(),
  maxPages: z.number().int().min(1).max(20).default(1),
  throttleMs: z.number().int().min(500).max(60000).default(2000),
});
export type ScrapeSourceInput = z.infer<typeof scrapeSourceInputSchema>;

const numeric = z.coerce.number();

export const listingsQuerySchema = z.object({
  bbox: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
    .optional(),
  txn: transactionTypeEnum.optional(),
  propertyType: propertyTypeEnum.optional(),
  minPrice: numeric.int().min(0).optional(),
  maxPrice: numeric.int().min(0).optional(),
  minSurface: numeric.int().min(0).optional(),
  minRooms: numeric.int().min(0).optional(),
  amenities: z.string().optional(), // CSV of amenity keys, parsed in the route
  fokontany: z.string().max(100).optional(),
  nearLandmark: z.string().max(120).optional(),
  nearLabel: z.string().max(120).optional(),
  nearLng: numeric.min(-180).max(180).optional(),
  nearLat: numeric.min(-90).max(90).optional(),
  radiusKm: numeric.min(0.1).max(50).optional(),
  excludeTitleContains: z.string().max(40).optional(),
  q: z.string().max(200).optional(),
  sort: z
    .enum(["relevance", "price_asc", "price_desc", "surface", "confidence", "compat"])
    .optional(),
  cursor: z.string().uuid().optional(),
  limit: numeric.int().min(1).max(200).optional(),
});
export type ListingsQuery = z.infer<typeof listingsQuerySchema>;
