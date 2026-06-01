CREATE TABLE "scrape_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"base_url" text NOT NULL,
	"list_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selectors" jsonb NOT NULL,
	"default_transaction_type" text,
	"max_pages" integer DEFAULT 1 NOT NULL,
	"throttle_ms" integer DEFAULT 2000 NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scrape_sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "source" SET DEFAULT 'user';--> statement-breakpoint
DROP TYPE "public"."listing_source";