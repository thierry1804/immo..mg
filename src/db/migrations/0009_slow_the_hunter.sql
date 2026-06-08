-- Confiance du géocodage automatique (0–100) + libellé de la méthode de
-- résolution. Alimente l'anneau de confiance de la modération (vue Focus).
-- (location_manual existe déjà via 0008 ; non répété ici.)
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "geo_confidence" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "geo_source" text;
