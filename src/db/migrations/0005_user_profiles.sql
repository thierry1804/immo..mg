CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"budget_min" bigint,
	"budget_max" bigint,
	"transaction_type" "transaction_type",
	"quartiers" text[] DEFAULT '{}' NOT NULL,
	"must_have" text[] DEFAULT '{}' NOT NULL,
	"property_types" text[] DEFAULT '{}' NOT NULL,
	"min_surface" integer,
	"alert_threshold" integer DEFAULT 80 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;