import { describe, expect, it } from "vitest";
import {
  FOKONTANY,
  fokontanyGeoJSON,
  haversineKm,
  matchFokontanyByName,
  resolveFokontany,
} from "./fokontany";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm(47.52, -18.87, 47.52, -18.87)).toBe(0);
  });

  it("computes a known short distance (Ivandry → Ankorondrano ≈ 1.8 km)", () => {
    const d = haversineKm(47.5286, -18.8694, 47.5236, -18.8853);
    expect(d).toBeGreaterThan(1.5);
    expect(d).toBeLessThan(2.2);
  });
});

describe("FOKONTANY data", () => {
  it("has unique names and sane radii", () => {
    const names = new Set(FOKONTANY.map((f) => f.name));
    expect(names.size).toBe(FOKONTANY.length);
    for (const f of FOKONTANY) {
      expect(f.radiusKm).toBeGreaterThan(0);
      expect(f.lat).toBeLessThan(0); // southern hemisphere
    }
  });
});

describe("resolveFokontany", () => {
  it("returns the neighborhood whose centroid is nearest within radius", () => {
    const ivandry = FOKONTANY.find((f) => f.name === "Ivandry")!;
    expect(resolveFokontany(ivandry.lng, ivandry.lat)).toBe("Ivandry");
  });

  it("returns null for a point far from every neighborhood", () => {
    // Far south Madagascar, nowhere near Tana
    expect(resolveFokontany(46.0, -25.0)).toBeNull();
  });
});

describe("matchFokontanyByName", () => {
  it("matches exact name case-insensitively", () => {
    expect(matchFokontanyByName("je cherche à IVANDRY")).toBe("Ivandry");
  });

  it("is accent insensitive", () => {
    expect(matchFokontanyByName("quartier ankorondrano")).toBe("Ankorondrano");
  });

  it("returns null when no neighborhood is named", () => {
    expect(matchFokontanyByName("une maison quelque part")).toBeNull();
  });
});

describe("fokontanyGeoJSON", () => {
  it("emits one closed-ring Polygon feature per neighborhood", () => {
    const fc = fokontanyGeoJSON(24);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(FOKONTANY.length);
    for (const f of fc.features) {
      expect(f.geometry.type).toBe("Polygon");
      const ring = f.geometry.coordinates[0];
      expect(ring).toHaveLength(25); // steps + 1
      expect(ring[0]).toEqual(ring[ring.length - 1]); // closed
    }
  });

  it("carries each neighborhood's name and a ring near its centroid", () => {
    const fc = fokontanyGeoJSON();
    const ivandry = FOKONTANY.find((f) => f.name === "Ivandry")!;
    const feat = fc.features.find((f) => f.properties.name === "Ivandry")!;
    const [lng, lat] = feat.geometry.coordinates[0][0];
    // First vertex sits ~radius east of the centroid, within a degree.
    expect(Math.abs(lat - ivandry.lat)).toBeLessThan(0.1);
    expect(lng).toBeGreaterThan(ivandry.lng);
  });
});
