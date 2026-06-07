-- Position fixée manuellement en modération : la validation conserve alors le
-- point exact au lieu de relancer le géocodage automatique.
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "location_manual" boolean DEFAULT false NOT NULL;
