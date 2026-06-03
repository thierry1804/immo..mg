"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const EVENT = "immo-favorites-change";

type FavoritesState = {
  ids: string[];
  loaded: boolean;
};

let state: FavoritesState = { ids: [], loaded: false };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    l();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): FavoritesState {
  return state;
}

async function loadFavorites(force = false) {
  if (inflight) return inflight;
  if (state.loaded && !force) return Promise.resolve();
  inflight = (async () => {
    try {
      const res = await fetch("/api/user/favorites");
      if (res.status === 401) {
        state = { ids: [], loaded: true };
        return;
      }
      if (!res.ok) {
        state = { ids: [], loaded: true };
        return;
      }
      const data = (await res.json()) as { ids?: string[] };
      state = { ids: data.ids ?? [], loaded: true };
    } catch {
      state = { ids: [], loaded: true };
    } finally {
      inflight = null;
      emit();
    }
  })();
  return inflight;
}

export function useFavorites() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!state.loaded) void loadFavorites();
    const onChange = () => void loadFavorites(true);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const toggle = useCallback(
    async (listingId: string) => {
      const has = snap.ids.includes(listingId);
      if (has) {
        await fetch(`/api/user/favorites?listingId=${listingId}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/user/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [snap.ids],
  );

  return {
    ids: snap.ids,
    toggle,
    loaded: snap.loaded,
    isFavorite: (id: string) => snap.ids.includes(id),
  };
}
