import { describe, expect, it } from "vitest";
import {
  FOKONTANY,
  matchFokontanyByName,
  resolveFokontany,
} from "./fokontany";

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
