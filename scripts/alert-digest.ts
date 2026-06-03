/**
 * Match new active listings against user profiles and create in-app
 * notifications + optional Resend emails.
 *
 *   npm run alert:digest
 */
import { and, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "../src/db/client";
import {
  listings,
  notifications,
  propertyDetails,
  userProfiles,
  users,
} from "../src/db/schema";
import { computeCompatibility } from "../src/lib/compatibility";
import type { Amenity } from "../src/lib/amenities";
import { sendEmail } from "../src/lib/email";
import { formatPrice } from "../src/lib/format";

const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

async function main() {
  const newListings = await db
    .select({
      listing: listings,
      surfaceM2: propertyDetails.surfaceM2,
    })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(
      and(
        eq(listings.status, "active"),
        eq(listings.isDuplicate, false),
        gte(listings.createdAt, since),
      ),
    );

  if (newListings.length === 0) {
    console.log("[alert-digest] no new listings");
    return;
  }

  const profiles = await db
    .select({
      profile: userProfiles,
      email: users.email,
    })
    .from(userProfiles)
    .innerJoin(users, eq(users.id, userProfiles.userId));

  let sent = 0;
  for (const { profile, email } of profiles) {
    for (const { listing, surfaceM2 } of newListings) {
      const compat = computeCompatibility(
        {
          budgetMin: profile.budgetMin,
          budgetMax: profile.budgetMax,
          transactionType: profile.transactionType,
          quartiers: profile.quartiers,
          mustHave: profile.mustHave as Amenity[],
          propertyTypes: profile.propertyTypes,
          minSurface: profile.minSurface,
        },
        {
          price: listing.price,
          transactionType: listing.transactionType,
          fokontany: listing.fokontany,
          amenities: (listing.amenities ?? []) as Amenity[],
          propertyType: listing.propertyType,
          surfaceM2,
        },
      );
      if (compat.score < profile.alertThreshold) continue;

      const title = `Nouveau bien : ${listing.title}`;
      const body = `${compat.score}% compatibilité · ${formatPrice(listing.price, listing.transactionType)}`;
      const id = crypto.randomUUID();
      await db.insert(notifications).values({
        id,
        userId: profile.userId,
        type: "match",
        listingId: listing.id,
        title,
        body,
      });
      sent++;
      await sendEmail({
        to: email,
        subject: `immo·mg — ${title}`,
        html: `<p>${body}</p><p><a href="https://immo.mg/listings/${listing.id}">Voir le bien</a></p>`,
      });
    }
  }
  console.log(`[alert-digest] created ${sent} notifications`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
