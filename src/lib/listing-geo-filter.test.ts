import { describe, expect, it } from "vitest";
import { fokontanyCentroid } from "@/lib/fokontany";
import { listingDistanceCenter } from "@/lib/listing-geo-filter";

describe("fokontanyCentroid", () => {
  it("returns Ivato centroid", () => {
    const c = fokontanyCentroid("Ivato");
    expect(c).toEqual({ lng: 47.472, lat: -18.832 });
  });
});

describe("listingDistanceCenter", () => {
  it("renvoie les coordonnées géocodées quand présentes", () => {
    expect(
      listingDistanceCenter({ nearLng: 47.52, nearLat: -18.91 }),
    ).toEqual({ lng: 47.52, lat: -18.91 });
  });

  it("retombe sur le centroïde fokontany", () => {
    expect(listingDistanceCenter({ fokontany: "Ivato" })).toEqual({
      lng: 47.472,
      lat: -18.832,
    });
  });

  it("renvoie null sans centre", () => {
    expect(listingDistanceCenter({})).toBeNull();
  });
});
