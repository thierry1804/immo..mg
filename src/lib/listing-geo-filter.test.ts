import { describe, expect, it } from "vitest";
import { fokontanyCentroid } from "@/lib/fokontany";

describe("fokontanyCentroid", () => {
  it("returns Ivato centroid", () => {
    const c = fokontanyCentroid("Ivato");
    expect(c).toEqual({ lng: 47.472, lat: -18.832 });
  });
});
