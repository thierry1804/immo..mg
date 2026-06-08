import { beforeEach, describe, expect, it, vi } from "vitest";

// db isolé : cache DB toujours vide, insert no-op.
vi.mock("@/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => [] }) }),
    }),
    insert: () => ({ values: () => ({ onConflictDoNothing: async () => {} }) }),
  },
}));

const fetchMock = vi.fn();
vi.mock("undici", () => ({ fetch: (...args: unknown[]) => fetchMock(...args) }));

import { geocode } from "@/scrapers/geocode";

describe("geocode — cache négatif", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("ne met PAS en cache un échec transitoire (réessaie au prochain appel)", async () => {
    fetchMock.mockRejectedValue(new Error("fetch failed"));
    const a = await geocode("Lieu transitoire unique A");
    const n1 = fetchMock.mock.calls.length;
    const b = await geocode("Lieu transitoire unique A");
    const n2 = fetchMock.mock.calls.length;
    expect(a).toBeNull();
    expect(b).toBeNull();
    // Chaque appel a retenté le réseau (≥1 fetch), donc le 2e n'a pas été
    // servi depuis un cache négatif gelé : n2 > n1.
    expect(n1).toBeGreaterThan(0);
    expect(n2).toBeGreaterThan(n1);
  }, 30_000);

  it("met en cache un vrai « aucun résultat » (pas de second appel)", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    const a = await geocode("Lieu introuvable unique B");
    const b = await geocode("Lieu introuvable unique B");
    expect(a).toBeNull();
    expect(b).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
