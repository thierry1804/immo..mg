"use client";

import type { DevAccessAccount, DevLoginPanel } from "@/lib/dev-access";
import Ico from "@/components/immo/Ico";

type Props = {
  panel: DevLoginPanel;
  onPick: (email: string, password: string) => void;
};

export default function DevAccessPanel({ panel, onPick }: Props) {
  if (!panel.enabled) return null;

  return (
    <section
      className="mt-8 rounded-2xl border border-gold-soft bg-gold-tint/50 p-4 shadow-card"
      aria-labelledby="dev-access-title"
    >
      <div className="flex items-start gap-2">
        <Ico name="bolt" size={18} className="mt-0.5 shrink-0 text-gold-700" />
        <div className="min-w-0 flex-1">
          <h2
            id="dev-access-title"
            className="text-sm font-semibold text-navy"
          >
            Accès développement
          </h2>
          <p className="mt-0.5 text-xs text-ink-2">
            Environnement local uniquement — non visible en production.
          </p>
        </div>
      </div>

      {panel.accounts.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {panel.accounts.map((account) => (
            <AccessRow
              key={account.email}
              account={account}
              onPick={onPick}
            />
          ))}
        </ul>
      ) : null}

      {panel.bootstrapEmail ? (
        <p className="mt-3 text-xs text-ink-2">
          <span className="font-medium text-navy">Admin bootstrap :</span>{" "}
          inscription avec{" "}
          <code className="rounded bg-white/80 px-1 py-0.5 text-[11px]">
            {panel.bootstrapEmail}
          </code>{" "}
          → rôle <code className="text-[11px]">admin</code> (
          <code className="text-[11px]">BOOTSTRAP_ADMIN_EMAIL</code>).
        </p>
      ) : null}

      <div className="mt-4 border-t border-gold-soft/80 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">
          Pages après connexion
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {panel.adminLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="focus-gold rounded-full border border-line bg-white/90 px-2.5 py-1 text-[11px] font-medium text-navy hover:border-navy-300"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AccessRow({
  account,
  onPick,
}: {
  account: DevAccessAccount;
  onPick: (email: string, password: string) => void;
}) {
  return (
    <li className="rounded-xl border border-line bg-white/90 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-navy">
            {account.label ?? account.email}
            {account.role ? (
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  account.role === "admin"
                    ? "bg-navy text-paper"
                    : "bg-paper-2 text-ink-2"
                }`}
              >
                {account.role}
              </span>
            ) : null}
          </p>
          <p className="truncate font-mono text-[11px] text-ink-2">
            {account.email}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-ink-2">
            Mot de passe :{" "}
            <span className="select-all text-navy">{account.password}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onPick(account.email, account.password)}
          className="focus-gold shrink-0 rounded-full bg-navy px-3 py-1.5 text-[11px] font-semibold text-paper transition hover:bg-navy-800"
        >
          Remplir
        </button>
      </div>
    </li>
  );
}
