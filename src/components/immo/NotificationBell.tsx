"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Ico from "./Ico";

type Notif = {
  id: string;
  title: string;
  body: string;
  listingId: string | null;
  readAt: string | null;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notif[]>([]);

  const load = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { notifications: Notif[]; unread: number } | null) => {
        if (!d) return;
        setItems(d.notifications);
        setUnread(d.unread);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="focus-gold relative rounded-full p-1.5 text-navy-100 hover:text-gold"
        aria-label="Notifications"
      >
        <Ico name="bolt" size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-navy">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-line bg-paper py-2 shadow-drawer">
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-xs font-semibold text-navy">Alertes</span>
            <button
              type="button"
              className="text-[10px] text-muted hover:text-ink"
              onClick={() => {
                void fetch("/api/notifications", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ markAllRead: true }),
                });
                setUnread(0);
                setItems((prev) =>
                  prev.map((n) => ({ ...n, readAt: new Date().toISOString() })),
                );
              }}
            >
              Tout marquer lu
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-muted">
                Aucune notification
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id} className="border-t border-line-2">
                  {n.listingId ? (
                    <Link
                      href={`/listings/${n.listingId}`}
                      className="block px-3 py-2 hover:bg-paper-2"
                      onClick={() => setOpen(false)}
                    >
                      <p className="text-xs font-medium text-navy">{n.title}</p>
                      <p className="text-[10px] text-muted">{n.body}</p>
                    </Link>
                  ) : (
                    <div className="px-3 py-2">
                      <p className="text-xs font-medium text-navy">{n.title}</p>
                      <p className="text-[10px] text-muted">{n.body}</p>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
