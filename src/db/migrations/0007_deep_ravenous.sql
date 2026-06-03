CREATE TABLE IF NOT EXISTS "listing_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"user_id" text,
	"reason" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"listing_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_favorites" (
	"user_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "embedding" real[];
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "embedding_model" text;
--> statement-breakpoint
ALTER TABLE "scrape_sources" ADD COLUMN IF NOT EXISTS "last_run_stats" jsonb;
--> statement-breakpoint
DO $body$ BEGIN
  ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $body$;
--> statement-breakpoint
DO $body$ BEGIN
  ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $body$;
--> statement-breakpoint
DO $body$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $body$;
--> statement-breakpoint
DO $body$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $body$;
--> statement-breakpoint
DO $body$ BEGIN
  ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $body$;
--> statement-breakpoint
DO $body$ BEGIN
  ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $body$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_favorites_user_idx" ON "user_favorites" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_status_duplicate_idx" ON "listings" USING btree ("status","is_duplicate");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_fokontany_txn_idx" ON "listings" USING btree ("fokontany","transaction_type");
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
DROP TEXT SEARCH CONFIGURATION IF EXISTS fr_unaccent;
--> statement-breakpoint
CREATE TEXT SEARCH CONFIGURATION fr_unaccent (COPY = french);
--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION fr_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, french_stem;
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('fr_unaccent', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('fr_unaccent', coalesce("description", '')), 'B') ||
    setweight(to_tsvector('fr_unaccent', coalesce("address", '')), 'C')
  ) STORED;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_search_vector_idx" ON "listings" USING gin ("search_vector");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION cosine_similarity(a real[], b real[])
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN a IS NULL OR b IS NULL OR array_length(a,1) IS DISTINCT FROM array_length(b,1)
      THEN NULL
    WHEN (SELECT sqrt(sum(x*x)) FROM unnest(a) x) = 0
      OR (SELECT sqrt(sum(y*y)) FROM unnest(b) y) = 0
      THEN NULL
    ELSE (
      SELECT sum(ea * eb) FROM (
        SELECT a[i] AS ea, b[i] AS eb
        FROM generate_subscripts(a, 1) AS i
      ) t
    ) / (
      (SELECT sqrt(sum(x*x)) FROM unnest(a) x) *
      (SELECT sqrt(sum(y*y)) FROM unnest(b) y)
    )
  END;
$$;
