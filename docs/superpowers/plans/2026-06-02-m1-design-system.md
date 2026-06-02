# Milestone 1 — Design System immo·mg — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace GeoMarket's generic zinc/Geist styling with the immo·mg design system foundation — navy/gold/paper tokens, Playfair Display + Hanken Grotesk fonts, the navy header/wordmark, a mobile TabBar, and a single-stroke icon set — so every later milestone styles against immo·mg tokens.

**Architecture:** Tailwind v4 is CSS-first. Brand tokens are declared as CSS custom properties on `:root`, mirrored onto a `.immo` scope (so the future Tweaks panel can override them globally), and exposed as Tailwind color/font utilities via `@theme inline` in `src/app/globals.css`. Fonts load through `next/font/google` with CSS variables wired into the theme. The root layout (`src/app/layout.tsx`) applies the fonts and renders the navy header + mobile TabBar. A presentational `<Ico>` component provides the single-stroke icon vocabulary.

**Tech Stack:** Next.js 16.2.7 (App Router), React 19, Tailwind CSS v4 (`@tailwindcss/postcss`), `next/font/google`.

> **Read before coding (AGENTS.md):** This Next.js is customized. The relevant guides were verified against `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` and `11-css.md` — `next/font/google` with the `variable` option and Tailwind v4 `@import "tailwindcss"` + `@theme` are the correct, current APIs. No deprecations apply to this milestone.

> **Note on TDD:** This milestone is visual foundation (CSS + layout + presentational icons), which is not meaningfully unit-testable. "Tests" here are: the production build passes (`npm run build`), and a visual check in the dev server. The TDD-heavy pure-function work begins in Milestone 2.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/app/globals.css` (modify) | immo·mg design tokens (`:root` + `.immo`), `@theme inline` mapping to Tailwind utilities, base body styling, signature primitives (`.pad`, `.ph` placeholder, score-bar fill). |
| `src/app/layout.tsx` (modify) | Load Playfair Display + Hanken Grotesk; apply font variables; render navy header + wordmark; render mobile TabBar; keep existing auth/nav logic. |
| `src/components/immo/Ico.tsx` (create) | Single-stroke icon set `<Ico name="..." />` per DESIGN §5. |
| `src/components/immo/TabBar.tsx` (create) | Mobile bottom tab bar (Rechercher · Carte · Chat · Profil). |

---

## Task 1: immo·mg design tokens in globals.css

**Files:**
- Modify: `src/app/globals.css` (replace entire contents)

- [ ] **Step 1: Replace `src/app/globals.css` with the immo·mg token system**

Replace the whole file with:

```css
@import "tailwindcss";

/* ----------------------------------------------------------------------------
   immo·mg design tokens (DESIGN.md §2-4). Declared on :root and mirrored on
   .immo so the future Tweaks panel can override them globally on the .immo
   scope without touching components.
---------------------------------------------------------------------------- */
:root {
  /* Navy */
  --navy: #0d2137;
  --navy-800: #112a45;
  --navy-700: #1a3a5c;
  --navy-600: #2b5176;
  --navy-300: #6f8aa6;
  --navy-100: #d7e0ea;

  /* Gold (accent) */
  --gold: #c9a84c;
  --gold-700: #a8893a;
  --gold-soft: #ede2c0;
  --gold-tint: #f7f1de;

  /* Paper / surfaces */
  --paper: #fafaf8;
  --paper-2: #f3f1ea;
  --line: #e7e3d8;
  --line-2: #ece9e0;

  /* Ink (text) */
  --ink: #0d2137;
  --ink-2: #43525f;
  --muted: #8a93a0;

  /* Semantic: equipment present (green) / absent (amber). No alarming red. */
  --present: oklch(0.52 0.085 150);
  --present-bg: oklch(0.95 0.03 150);
  --absent: oklch(0.66 0.1 70);
  --absent-bg: oklch(0.95 0.045 80);

  /* Shadows (always navy-tinted, never pure grey) */
  --shadow-card: 0 14px 30px -18px rgba(13, 33, 55, 0.22);
  --shadow-top-match: 0 0 0 1px var(--gold), 0 16px 34px -20px rgba(201, 168, 76, 0.5);
  --shadow-drawer: 0 -12px 50px rgba(13, 33, 55, 0.3);
}

/* The .immo scope inherits the same tokens; Tweaks overrides will target it. */
.immo {
  --navy: #0d2137;
  --gold: #c9a84c;
  --gold-700: #a8893a;
  --gold-soft: #ede2c0;
  --gold-tint: #f7f1de;
  --paper: #fafaf8;
  --paper-2: #f3f1ea;
}

/* ----------------------------------------------------------------------------
   Expose tokens + next/font variables as Tailwind utilities.
   Enables bg-navy, text-gold, border-line, font-display, font-sans, etc.
---------------------------------------------------------------------------- */
@theme inline {
  --color-navy: var(--navy);
  --color-navy-800: var(--navy-800);
  --color-navy-700: var(--navy-700);
  --color-navy-600: var(--navy-600);
  --color-navy-300: var(--navy-300);
  --color-navy-100: var(--navy-100);

  --color-gold: var(--gold);
  --color-gold-700: var(--gold-700);
  --color-gold-soft: var(--gold-soft);
  --color-gold-tint: var(--gold-tint);

  --color-paper: var(--paper);
  --color-paper-2: var(--paper-2);
  --color-line: var(--line);
  --color-line-2: var(--line-2);

  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-muted: var(--muted);

  --color-present: var(--present);
  --color-present-bg: var(--present-bg);
  --color-absent: var(--absent);
  --color-absent-bg: var(--absent-bg);

  --font-display: var(--font-playfair);
  --font-sans: var(--font-hanken);
}

/* ----------------------------------------------------------------------------
   Base
---------------------------------------------------------------------------- */
body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-hanken), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Tabular figures for data (prices, scores). */
.tnum {
  font-variant-numeric: tabular-nums;
}

/* 24px screen gutter (DESIGN §4). */
.pad {
  padding-inline: 24px;
}

@layer components {
  /* Reworked form input on the immo palette. */
  .input {
    @apply w-full rounded-[12px] border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-navy;
  }

  /* Striped photo placeholder (DESIGN §6): navy ground + diagonal hatching. */
  .ph {
    background-color: var(--navy);
    background-image: repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.05) 0,
      rgba(255, 255, 255, 0.05) 1px,
      transparent 1px,
      transparent 10px
    );
    color: var(--navy-300);
    font-family: ui-monospace, monospace;
    font-size: 10.5px;
  }

  /* Confidence/score bar fill: the one allowed decorative gradient (DESIGN §2). */
  .score-fill {
    background-image: linear-gradient(90deg, var(--gold-700), var(--gold));
  }
}
```

- [ ] **Step 2: Verify the stylesheet compiles (build)**

Run: `npm run build`
Expected: build completes without CSS errors. (It is acceptable for the build to fail only on a missing `--font-playfair` / `--font-hanken` value until Task 2 wires the fonts — the CSS itself must parse. If the build fails here, the error will be a JS/route error, not a CSS parse error.)

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): add immo·mg design tokens and Tailwind theme mapping"
```

---

## Task 2: Fonts + navy header + TabBar in root layout

**Files:**
- Modify: `src/app/layout.tsx` (replace entire contents)
- Create: `src/components/immo/TabBar.tsx`

- [ ] **Step 1: Create the mobile TabBar component**

Create `src/components/immo/TabBar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Ico, { type IcoName } from "./Ico";

const TABS: Array<{ href: string; label: string; icon: IcoName }> = [
  { href: "/", label: "Rechercher", icon: "spark" },
  { href: "/?view=map", label: "Carte", icon: "pin" },
  { href: "/chat", label: "Chat", icon: "spark" },
  { href: "/preferences", label: "Profil", icon: "house" },
];

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-navy-700 bg-navy text-paper md:hidden">
      {TABS.map((t) => {
        const active = pathname === t.href.split("?")[0];
        return (
          <Link
            key={t.label}
            href={t.href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              active ? "text-gold" : "text-navy-300"
            }`}
          >
            <Ico name={t.icon} size={20} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

> Note: `Ico` and `IcoName` are created in Task 3. Implement Task 3 before running the build in Step 3 of this task, or implement Task 3 first.

- [ ] **Step 2: Replace `src/app/layout.tsx`**

Replace the whole file with:

```tsx
import type { Metadata } from "next";
import { Playfair_Display, Hanken_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import LogoutButton from "@/components/LogoutButton";
import TabBar from "@/components/immo/TabBar";
import { getCurrentSession } from "@/lib/auth";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "immo·mg — Conseiller immobilier IA",
  description:
    "Agrège, dédoublonne et enrichit les annonces immobilières d'Antananarivo. Confiance, coût réel et recommandation.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await getCurrentSession();
  return (
    <html
      lang="fr"
      className={`${playfair.variable} ${hanken.variable} immo h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        <header className="flex h-14 items-center justify-between bg-navy px-6 text-paper">
          <Link
            href="/"
            className="font-display text-lg font-semibold tracking-tight"
          >
            immo<span className="text-gold">·</span>mg
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {user ? (
              <>
                {user.role === "admin" && (
                  <>
                    <Link
                      href="/admin/sources"
                      className="hidden text-navy-100 hover:text-gold sm:inline"
                    >
                      Sources
                    </Link>
                    <Link
                      href="/admin/moderation"
                      className="hidden text-navy-100 hover:text-gold sm:inline"
                    >
                      Modération
                    </Link>
                  </>
                )}
                <Link
                  href="/listings/new"
                  className="rounded-full bg-gold px-3 py-1.5 font-semibold text-navy"
                >
                  + Publier
                </Link>
                <span className="hidden text-navy-300 sm:inline">
                  {user.email}
                </span>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-navy-100 hover:text-gold"
                >
                  Connexion
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-gold px-3 py-1.5 font-semibold text-navy"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </nav>
        </header>
        <div className="pb-14 md:pb-0">{children}</div>
        <TabBar />
      </body>
    </html>
  );
}
```

> `LogoutButton` currently uses zinc classes; it is restyled in Milestone 3. It remains functional here.

- [ ] **Step 3: Verify the build passes**

Run: `npm run build`
Expected: PASS. Playfair Display and Hanken Grotesk are fetched and self-hosted by `next/font`. No CSS-variable errors.

- [ ] **Step 4: Visual check in dev server**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: navy header bar with gold-dotted "immo·mg" wordmark in a serif (Playfair); paper (`#FAFAF8`) page background; gold pill buttons; on a narrow viewport (<768px) a navy bottom TabBar with 4 tabs, the active one in gold.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/components/immo/TabBar.tsx
git commit -m "feat(design): immo·mg fonts, navy header/wordmark, mobile TabBar"
```

---

## Task 3: Single-stroke icon set `<Ico>`

**Files:**
- Create: `src/components/immo/Ico.tsx`

- [ ] **Step 1: Create `src/components/immo/Ico.tsx`**

Single-stroke, geometric, never filled (DESIGN §5), `stroke-width` 1.7 (2.4 for checks):

```tsx
import type { SVGProps } from "react";

export type IcoName =
  | "spark"
  | "shield"
  | "bolt"
  | "gate"
  | "car"
  | "drop"
  | "plug"
  | "house"
  | "bed"
  | "ruler"
  | "floors"
  | "check"
  | "minus"
  | "pin"
  | "layers"
  | "school"
  | "clock";

const PATHS: Record<IcoName, React.ReactNode> = {
  spark: <path d="M12 3v6m0 6v6m-9-9h6m6 0h6" />,
  shield: <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" />,
  bolt: <path d="M13 3L5 13h6l-2 8 8-10h-6l2-8z" />,
  gate: <path d="M4 21V6l8-3 8 3v15M4 11h16M9 11v10M15 11v10" />,
  car: <path d="M5 16l1.5-5h11L19 16M3 16h18v3H3zM7 19v2M17 19v2" />,
  drop: <path d="M12 3c4 5 6 8 6 11a6 6 0 11-12 0c0-3 2-6 6-11z" />,
  plug: <path d="M9 3v5m6-5v5M6 8h12v3a6 6 0 01-12 0V8zm6 9v4" />,
  house: <path d="M4 11l8-7 8 7M6 10v10h12V10" />,
  bed: <path d="M3 8v10M3 13h18v5M21 18v-5a3 3 0 00-3-3H9v3" />,
  ruler: <path d="M4 14L14 4l6 6L10 20 4 14zm3-3l2 2m1-4l2 2m1-4l2 2" />,
  floors: <path d="M4 20h16M4 20V9l8-5 8 5v11M9 20v-6h6v6" />,
  check: <path d="M5 12l5 5L19 7" strokeWidth={2.4} />,
  minus: <path d="M6 12h12" strokeWidth={2.4} />,
  pin: <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12zm0-9a3 3 0 100-6 3 3 0 000 6z" />,
  layers: <path d="M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5" />,
  school: <path d="M3 9l9-4 9 4-9 4-9-4zm3 2v5c0 1 3 2 6 2s6-1 6-2v-5" />,
  clock: <path d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-14v5l3 2" />,
};

type Props = SVGProps<SVGSVGElement> & { name: IcoName; size?: number };

export default function Ico({ name, size = 18, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
```

- [ ] **Step 2: Verify lint/build picks up the component**

Run: `npm run build`
Expected: PASS, no TypeScript errors. (The TabBar from Task 2 imports `Ico`/`IcoName`; both resolve.)

- [ ] **Step 3: Visual smoke check**

In `npm run dev`, the mobile TabBar icons render as thin single-stroke glyphs (no fills), gold on the active tab.

- [ ] **Step 4: Commit**

```bash
git add src/components/immo/Ico.tsx
git commit -m "feat(design): add single-stroke Ico icon set"
```

---

## Self-Review

**Spec coverage (vs spec M1):**
- immo tokens in `globals.css` + `@theme` mapping → Task 1. ✓
- Playfair + Hanken via `next/font` → Task 2. ✓
- Navy header + wordmark → Task 2. ✓
- Mobile TabBar (Rechercher · Carte · Chat · Profil) → Task 2 (TabBar component). ✓
- `Ico` single-stroke set (DESIGN §5 vocabulary) → Task 3. ✓
- `.pad`, `.ph` placeholder, score-bar fill primitives (DESIGN §4/§6) → Task 1. ✓
- Tweaks panel — explicitly marked stretch/deferred in the spec; not in M1 tasks (intentional). ✓

**Placeholder scan:** No TBD/TODO; all code blocks are complete and concrete.

**Type consistency:** `IcoName` is defined in `Ico.tsx` (Task 3) and consumed by `TabBar.tsx` (Task 2) and the layout uses only Tailwind utilities backed by the `@theme` colors from Task 1 (`bg-navy`, `text-gold`, `text-navy-100`, `text-navy-300`, `bg-paper`, `text-ink`, `border-navy-700`, `font-display`). `--font-playfair`/`--font-hanken` defined in Task 2 match the `@theme` `--font-display`/`--font-sans` references in Task 1. Consistent.

**Build-order note for executor:** Task 2's TabBar imports `Ico` (Task 3). When running tasks strictly in order, create `Ico.tsx` (Task 3 Step 1) before the Task 2 build step, or reorder to do Task 3 before Task 2's build. The commits remain independent.
