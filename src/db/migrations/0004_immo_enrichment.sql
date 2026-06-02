ALTER TABLE "listings" ADD COLUMN "fokontany" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "amenities" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "confidence_score" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "confidence_breakdown" jsonb;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "price_per_sqm" bigint;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "estimated_real_cost" bigint;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "canonical_id" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "is_duplicate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "listings_amenities_idx" ON "listings" USING gin ("amenities");