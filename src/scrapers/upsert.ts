import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { listingPhotos, listings, propertyDetails } from "@/db/schema";
import type { NormalizedListing } from "./types";

export type UpsertOutcome = "inserted" | "updated" | "unchanged";

export async function upsertScrapedListing(
  n: NormalizedListing,
): Promise<UpsertOutcome> {
  const existing = await db
    .select({
      id: listings.id,
      rawHash: listings.rawHash,
    })
    .from(listings)
    .where(
      and(eq(listings.source, n.source), eq(listings.externalId, n.externalId)),
    )
    .limit(1);

  if (existing.length === 0) {
    const id = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(listings).values({
        id,
        userId: null,
        title: n.title,
        description: n.description,
        transactionType: n.transactionType,
        propertyType: n.propertyType,
        price: n.price,
        address: n.address,
        location: { lng: n.lng, lat: n.lat },
        status: "pending_review",
        source: n.source,
        externalUrl: n.externalUrl,
        externalId: n.externalId,
        scrapedAt: new Date(),
        rawHash: n.rawHash,
      });
      await tx.insert(propertyDetails).values({
        listingId: id,
        surfaceM2: n.surfaceM2,
        rooms: n.rooms,
        bedrooms: null,
        bathrooms: null,
      });
      if (n.imageUrls.length > 0) {
        await tx.insert(listingPhotos).values(
          n.imageUrls.map((url, i) => ({
            id: crypto.randomUUID(),
            listingId: id,
            path: url,
            displayOrder: i,
          })),
        );
      }
    });
    return "inserted";
  }

  const current = existing[0];
  if (current.rawHash === n.rawHash) return "unchanged";

  await db.transaction(async (tx) => {
    await tx
      .update(listings)
      .set({
        title: n.title,
        description: n.description,
        price: n.price,
        address: n.address,
        location: { lng: n.lng, lat: n.lat },
        rawHash: n.rawHash,
        scrapedAt: new Date(),
      })
      .where(eq(listings.id, current.id));
    await tx
      .update(propertyDetails)
      .set({ surfaceM2: n.surfaceM2, rooms: n.rooms })
      .where(eq(propertyDetails.listingId, current.id));
    await tx
      .delete(listingPhotos)
      .where(eq(listingPhotos.listingId, current.id));
    if (n.imageUrls.length > 0) {
      await tx.insert(listingPhotos).values(
        n.imageUrls.map((url, i) => ({
          id: crypto.randomUUID(),
          listingId: current.id,
          path: url,
          displayOrder: i,
        })),
      );
    }
  });
  return "updated";
}
