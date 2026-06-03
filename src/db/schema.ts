import {
  bigint,
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type GeoPoint = { lng: number; lat: number };

export const geographyPoint = customType<{
  data: GeoPoint;
  driverData: string;
}>({
  dataType() {
    return "geography(Point, 4326)";
  },
  toDriver(value) {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
  fromDriver(value) {
    const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(value);
    if (!match) throw new Error(`Unparseable geography point: ${value}`);
    return { lng: Number(match[1]), lat: Number(match[2]) };
  },
});

export const transactionType = pgEnum("transaction_type", ["sale", "rent"]);
export const propertyType = pgEnum("property_type", [
  "house",
  "apartment",
  "land",
  "commercial",
  "other",
]);
export const listingStatus = pgEnum("listing_status", [
  "active",
  "archived",
  "pending_review",
  "rejected",
]);
// Built-in source slugs that still exist as hardcoded scrapers; dynamic
// sources from `scrape_sources` use their own slug values.
export const BUILTIN_SOURCE_SLUGS = [
  "user",
  "coinafrique",
  "ofim",
  "acropole",
  "etrano",
  "facebook",
] as const;
export type BuiltinSourceSlug = (typeof BUILTIN_SOURCE_SLUGS)[number];

export const userRole = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  role: userRole("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    transactionType: transactionType("transaction_type").notNull(),
    propertyType: propertyType("property_type").notNull(),
    price: bigint("price", { mode: "number" }).notNull(),
    address: text("address").notNull(),
    location: geographyPoint("location").notNull(),
    status: listingStatus("status").notNull().default("active"),
    source: text("source").notNull().default("user"),
    externalUrl: text("external_url"),
    externalId: text("external_id"),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }),
    rawHash: text("raw_hash"),
    fokontany: text("fokontany"),
    amenities: text("amenities").array().notNull().default([]),
    confidenceScore: integer("confidence_score"),
    confidenceBreakdown: jsonb("confidence_breakdown").$type<
      { key: string; label: string; ok: boolean; weight: number }[]
    >(),
    pricePerSqm: bigint("price_per_sqm", { mode: "number" }),
    estimatedRealCost: bigint("estimated_real_cost", { mode: "number" }),
    canonicalId: text("canonical_id"),
    sources: jsonb("sources")
      .$type<{ source: string; url: string | null }[]>()
      .notNull()
      .default([]),
    isDuplicate: boolean("is_duplicate").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    embedding: real("embedding").array(),
    embeddingModel: text("embedding_model"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("listings_location_idx").using("gist", t.location),
    index("listings_amenities_idx").using("gin", t.amenities),
    index("listings_status_duplicate_idx").on(t.status, t.isDuplicate),
    index("listings_fokontany_txn_idx").on(t.fokontany, t.transactionType),
  ],
);

// Declared compatibility profile (M5). One row per user; all preference fields
// optional — a dimension left blank scores neutrally in computeCompatibility.
export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  budgetMin: bigint("budget_min", { mode: "number" }),
  budgetMax: bigint("budget_max", { mode: "number" }),
  transactionType: transactionType("transaction_type"),
  quartiers: text("quartiers").array().notNull().default([]),
  mustHave: text("must_have").array().notNull().default([]),
  propertyTypes: text("property_types").array().notNull().default([]),
  minSurface: integer("min_surface"),
  alertThreshold: integer("alert_threshold").notNull().default(80),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const propertyDetails = pgTable("property_details", {
  listingId: text("listing_id")
    .primaryKey()
    .references(() => listings.id, { onDelete: "cascade" }),
  surfaceM2: integer("surface_m2").notNull(),
  rooms: integer("rooms").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
});

export const listingPhotos = pgTable("listing_photos", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export type SourceSelectors = {
  card: string;
  link: string;
  title: string;
  price: string;
  address: string;
  image?: string | null;
};

export const scrapeSources = pgTable("scrape_sources", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  baseUrl: text("base_url").notNull(),
  listUrls: jsonb("list_urls").$type<string[]>().notNull().default([]),
  selectors: jsonb("selectors").$type<SourceSelectors>().notNull(),
  defaultTransactionType: text("default_transaction_type"),
  maxPages: integer("max_pages").notNull().default(1),
  throttleMs: integer("throttle_ms").notNull().default(2000),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastRunStats: jsonb("last_run_stats").$type<{
    inserted: number;
    updated: number;
    unchanged: number;
    dropped: number;
    errors: number;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userFavorites = pgTable(
  "user_favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("user_favorites_user_idx").on(t.userId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    listingId: text("listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notifications_user_unread_idx").on(t.userId, t.readAt)],
);

export const listingReports = pgTable("listing_reports", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const geocodeCache = pgTable("geocode_cache", {
  addressHash: text("address_hash").primaryKey(),
  lng: doublePrecision("lng").notNull(),
  lat: doublePrecision("lat").notNull(),
  foundAt: timestamp("found_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type PropertyDetails = typeof propertyDetails.$inferSelect;
export type ListingPhoto = typeof listingPhotos.$inferSelect;
export type ScrapeSource = typeof scrapeSources.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
