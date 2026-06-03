CREATE INDEX IF NOT EXISTS "listings_status_duplicate_idx" ON "listings" ("status", "is_duplicate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_fokontany_txn_idx" ON "listings" ("fokontany", "transaction_type");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_favorites" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "listing_id" text NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "listing_id")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "listing_id" text REFERENCES "listings"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" ("user_id", "read_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listing_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "listing_id" text NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "reason" text NOT NULL,
  "detail" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "scrape_sources" ADD COLUMN IF NOT EXISTS "last_run_stats" jsonb;
