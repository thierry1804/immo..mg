CREATE TYPE "public"."listing_source" AS ENUM('user', 'bazary', 'jovenna', 'lacoteimmobiliere', 'coinafrique', 'facebook');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
ALTER TYPE "public"."listing_status" ADD VALUE 'pending_review';--> statement-breakpoint
ALTER TYPE "public"."listing_status" ADD VALUE 'rejected';--> statement-breakpoint
CREATE TABLE "geocode_cache" (
	"address_hash" text PRIMARY KEY NOT NULL,
	"lng" double precision NOT NULL,
	"lat" double precision NOT NULL,
	"found_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "source" "listing_source" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "external_url" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "scraped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "raw_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "listings_source_external_id_idx" ON "listings" ("source", "external_id") WHERE "external_id" IS NOT NULL;