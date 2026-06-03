/**
 * Recalcule position + fokontany des annonces scrapées.
 * Usage :
 *   npm run db:regeocode-pending
 *   REGEOCODE_STATUSES=active npm run db:regeocode-pending
 */
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "../src/db/client";
import { listings } from "../src/db/schema";
import { resolveListingLocation } from "../src/lib/listing-location";

async function main() {
  const statuses = (process.env.REGEOCODE_STATUSES ?? "pending_review")
    .split(",")
    .map((s) => s.trim()) as ("pending_review" | "active")[];

  const ivatoFilter = process.env.REGEOCODE_FILTER === "ivato";
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      address: listings.address,
    })
    .from(listings)
    .where(
      ivatoFilter
        ? and(
            inArray(listings.status, statuses),
            or(
              ilike(listings.title, "%paon%"),
              ilike(listings.title, "%antanetibe%"),
              ilike(listings.title, "%anjomakely%"),
              ilike(listings.title, "%ivato%"),
            ),
          )
        : inArray(listings.status, statuses),
    );

  let ok = 0;
  let fail = 0;

  const skipNetwork = process.env.GEOCODE_SKIP_NETWORK === "true";
  if (skipNetwork) {
    console.log("Mode hors-ligne : repères + fokontany uniquement (pas de Nominatim).\n");
  }

  for (const row of rows) {
    try {
      const located = await resolveListingLocation({
        title: row.title,
        description: row.description,
        address: row.address,
      });
      if (!located) {
        console.warn(`⚠ ${row.id} — ${row.title.slice(0, 60)}`);
        fail++;
        continue;
      }
      await db
        .update(listings)
        .set({
          address: located.address,
          fokontany: located.fokontany,
          location: { lng: located.lng, lat: located.lat },
        })
        .where(eq(listings.id, row.id));
      console.log(
        `✓ ${row.title.slice(0, 50)} → ${located.fokontany ?? "?"} (${located.lat.toFixed(4)}, ${located.lng.toFixed(4)})`,
      );
      ok++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`⚠ ${row.id} — ${row.title.slice(0, 50)} (erreur: ${msg})`);
      fail++;
    }
  }

  console.log(`\n${ok} mis à jour, ${fail} en échec sur ${rows.length} annonces.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
