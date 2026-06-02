# DESIGN.md — immo·mg

> Système visuel : le luxe par la retenue.
> Navy dominant, or en accent, blanc chaud. Aucun dégradé, aucun néon, aucun violet.

---

## 1. Principe directeur

**Le standing se signale par la retenue, pas par l'éclat.** L'interface doit inspirer confiance immédiate à un acheteur aisé : typographie éditoriale, surfaces calmes, hiérarchie claire, accent métallique parcimonieux. On vise la sensation d'une conciergerie privée, pas d'une marketplace.

Trois règles non négociables :
1. **Calme** — beaucoup de blanc chaud, peu d'éléments par écran.
2. **Confiance lisible** — le score de confiance est toujours visible.
3. **Or rare** — l'accent or signale uniquement ce qui mérite l'attention (top match, CTA, score).

---

## 2. Couleurs

### Palette de marque

| Token | Valeur | Usage |
|---|---|---|
| `--navy` | `#0D2137` | Dominante : barres, texte, surfaces sombres, FAB |
| `--navy-800/700/600` | `#112a45` / `#1a3a5c` / `#2b5176` | Profondeur sur fonds sombres |
| `--navy-300` | `#6f8aa6` | Icônes secondaires, traits discrets |
| `--navy-100` | `#d7e0ea` | Bordures sur navy clair |
| `--gold` | `#C9A84C` | **Accent** : top match, CTA, scores, puces |
| `--gold-700` | `#a8893a` | Or foncé (texte sur clair, dégradé de barre) |
| `--gold-soft` / `--gold-tint` | `#ede2c0` / `#f7f1de` | Bords et fonds teintés or |
| `--paper` | `#FAFAF8` | Fond chaud principal |
| `--paper-2` | `#f3f1ea` | Surfaces creuses, pistes de barres |
| `--line` / `--line-2` | `#e7e3d8` / `#ece9e0` | Bordures, séparateurs |
| `--ink` / `--ink-2` / `--muted` | `#0D2137` / `#43525f` / `#8a93a0` | Texte primaire / secondaire / tertiaire |

### Couleurs sémantiques (équipements & scores)

| Token | Valeur (oklch) | Sens |
|---|---|---|
| `--present` / `--present-bg` | `oklch(0.52 0.085 150)` / `oklch(0.95 0.03 150)` | Équipement **présent** (vert) |
| `--absent` / `--absent-bg` | `oklch(0.66 0.10 70)` / `oklch(0.95 0.045 80)` | Équipement **absent** (ambre) |

> Vert et ambre partagent une chroma basse et harmonisée — pas de rouge alarmant : un manque n'est pas une faute, c'est une information.

### Interdits
- Pas de dégradés décoratifs (seule exception : le remplissage subtil des barres de score `gold-700 → gold`).
- Pas de néon, pas de violet, pas d'ombres génériques colorées.

---

## 3. Typographie

| Rôle | Police | Détail |
|---|---|---|
| **Titres / display** | Playfair Display | Serif à fort contraste, 500–700. Donne l'autorité éditoriale. |
| **UI / données** | Hanken Grotesk | Grotesque propre et neutre, 400–700. Chiffres en `tabular-nums`. |

Échelle pratique (mobile 390px) :

```
h1 accueil        27 px / 1.12   Playfair 600
titre drawer      22 px          Playfair 700
prix              18–21 px       Playfair 700, tabular-nums
titre carte       15.5–17 px     Playfair 600
corps             14–15 px       Hanken 400/500
eyebrow / label   11 px          Hanken 600, +0.14em, UPPERCASE
légende mono      10.5 px        ui-monospace (placeholders)
```

Principe : **serif pour le sens et la valeur** (noms, prix, scores), **sans pour la donnée et l'action** (attributs, boutons, métadonnées).

---

## 4. Espacement, rayons, ombres

- **Gouttière écran** : 24 px (`.pad`).
- **Rayons** : cartes 14–16 px · barre de recherche 18 px · drawers 24 px · pills 999 px · puces/tags 6–11 px.
- **Ombres** : très douces, jamais grises pures — teintées navy.
  - Carte recherche : `0 14px 30px -18px rgba(13,33,55,.22)`.
  - Top match (or) : `0 0 0 1px var(--gold), 0 16px 34px -20px rgba(201,168,76,.5)`.
  - Drawer : `0 -12px 50px rgba(13,33,55,.3)`.
- **Layout** : flex/grid + `gap` partout ; jamais de marges inline fragiles.

---

## 5. Iconographie

Jeu d'icônes **trait unique**, dessiné maison (`<Ico>`), `stroke-width` 1.7 (2.2–2.6 pour les coches). Style linéaire géométrique, jamais rempli — sauf les glyphes d'accent (étincelle IA, avion d'envoi) remplis en or sur navy. Taille courante 14–18 px.

Vocabulaire : `spark` (IA), `shield` (gardien), `bolt` (groupe élec.), `gate` (résidence), `car` (parking), `drop`/`plug` (charges), `house`/`bed`/`ruler`/`floors` (bien), `check`/`minus` (présent/absent), `pin`/`layers`/`school`/`clock` (carte & contexte).

---

## 6. Imagerie

Aucune illustration SVG complexe dessinée à la main. Les photos sont des **placeholders striés élégants** (`.ph`) : fond navy foncé + hachures diagonales discrètes + légende monospace dédiée (« photo villa · 220 m² »). Ils indiquent quoi déposer et tiennent le rythme visuel en attendant les vraies images.

---

## 7. Patterns signature

- **Bandeau marché** — cartes 138px scrollables, loyer médian en Playfair, tendance verte ↑ / ambre ↓.
- **Carte top match** — bordure or + halo doux ; badge compatibilité navy translucide ; badge source blanc.
- **Anneau de compatibilité** — cercle SVG navy/or, score Playfair au centre, raisons ✓/− à côté.
- **Estimateur de coût réel** — lignes séparées, total en Playfair navy, plus grand.
- **Barre de confiance** — piste `paper-2`, remplissage dégradé or, liste de coches vertes dessous.
- **Carte stylisée** — fond radial navy, zones *fokontany* en couleurs translucides `mix-blend: screen`, étiquettes prix flottantes (or = top match), toggles de couches.
- **Barre de comparaison / compare bar** — fond navy, vignettes empilées, CTA or.
- **FAB chat** — cercle navy 58px, glyphe étincelle or, ombre portée navy.

---

## 8. Réglages d'ambiance (Tweaks)

Trois contrôles repeignent tout le parcours via les variables CSS de `.immo` — ils changent le *feel*, pas un pixel isolé.

| Réglage | Options | Effet |
|---|---|---|
| **Accent** | Or · Émeraude · Cuivre · Saphir | Chaque accent est une rampe de 4 tons (base / foncé / bord / fond) appliquée aux badges, scores, bordures top-match, barres et puces. |
| **Police des titres** | Playfair Display · Cormorant Garamond · DM Serif Display · Marcellus | Du contraste moderne à l'old-style élégant ou l'éditorial affirmé. |
| **Température du fond** | Chaud · Frais · Greige | Réchauffe ou refroidit blancs, lignes et surfaces creuses. |

Implémentation : un bloc `<style>` injecte les overrides sur `.immo` à partir de l'état `useTweaks`. Aucun composant ne code une couleur en dur hors des tokens, ce qui rend ces bascules globales et instantanées.

---

## 9. Fichiers

| Fichier | Contenu |
|---|---|
| `Immo MG.html` | Page hôte : polices, canvas, montage React, panneau Tweaks. |
| `immo.css` | Système complet : tokens `.immo` + tous les composants d'écran. |
| `screens-core.jsx` | Icônes `<Ico>`, barre d'état, wordmark, Accueil, Résultats, TabBar. |
| `screens-detail.jsx` | Écran 3 — détail propriété (drawer). |
| `screens-extra.jsx` | Écrans 4–6 (chat, comparaison, cold start) + 2 variantes. |
| `design-canvas.jsx` / `tweaks-panel.jsx` | Scaffolds (canvas comparatif, panneau de réglages). |

> Toutes les couleurs, polices et mesures vivent dans les tokens `.immo` de `immo.css`. Pour faire évoluer la marque, on touche aux tokens — pas aux composants.
