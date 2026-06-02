# PRODUCT.md — immo·mg

> Conseiller immobilier IA pour la classe aisée malgache.
> Agrège, dédoublonne et enrichit les annonces de plusieurs sources, puis agit comme un conseiller personnel.

---

## 1. Vision

**immo·mg** transforme la recherche immobilière à Antananarivo — aujourd'hui dispersée entre Avana, OLX et des groupes Facebook — en une expérience unique, fiable et conversationnelle. La plateforme ne se contente pas de lister : elle **agrège** les annonces de toutes les sources, les **dédoublonne**, les **enrichit par IA** (coût réel, score de confiance, compatibilité) et joue le rôle d'un **conseiller personnel** qui comprend le langage naturel.

Promesse en une phrase : *« Décrivez le bien que vous cherchez — l'assistant s'occupe du reste. »*

---

## 2. Utilisateur cible

| Attribut | Détail |
|---|---|
| **Profil** | Malgaches aisés, 30–55 ans |
| **Langue** | Francophones (interface 100 % français) |
| **Matériel** | iPhone / Android haut de gamme |
| **Connexion** | 4G stable ou fibre |
| **Valeurs** | Confiance, rapidité et standing avant tout |

Ce que cet utilisateur déteste : perdre du temps sur des annonces douteuses, des photos volées, des prix incohérents, et remplir des formulaires.

---

## 3. Problèmes résolus

1. **Fragmentation** — les annonces sont éparpillées sur 3+ plateformes, souvent en double.
2. **Manque de confiance** — photos non originales, prix fantaisistes, annonceurs opaques.
3. **Coût réel masqué** — le loyer affiché cache eau, électricité, gardien, charges de résidence.
4. **Friction** — formulaires et filtres rigides au lieu d'une expression naturelle du besoin.
5. **Cold start** — une recommandation sans données utilisateur est une recommandation suspecte.

---

## 4. Piliers produit

### 4.1 La confiance avant la personnalisation
Le **score de confiance (0–100)** est visible sur **chaque** carte, toujours. C'est le premier signal, jamais optionnel. Il se décompose toujours en raisons vérifiables (photos originales, prix cohérent avec le marché, présence multi-plateformes, ancienneté de l'annonceur).

### 4.2 IA explicable
Aucun score n'est montré sans ses raisons. La compatibilité « 94 % » s'accompagne systématiquement de 3–4 puces (budget respecté ✓, quartier préféré ✓, groupe électrogène ✓, peu de commerces à pied −).

### 4.3 Coût réel, pas prix affiché
Chaque bien expose un **estimateur de coût réel mensuel** : loyer + eau + électricité + gardien + charges = total. C'est l'information qui compte pour décider.

### 4.4 Friction zéro
Pas de formulaire, pas de filtre obligatoire. La **recherche IA conversationnelle** remplace tout : l'utilisateur parle, l'assistant extrait les filtres structurés.

### 4.5 Conscient du standing
Les attributs premium (résidence sécurisée, piscine, accès bitumé, fibre, gardien 24h, groupe électrogène, parking couvert) sont des critères de **premier rang**, pas des extras.

---

## 5. Parcours et écrans

| # | Écran | Rôle |
|---|---|---|
| 1 | **Accueil / Recherche IA** | Barre conversationnelle en hero. Bandeau marché (loyers médians par quartier + tendance mensuelle). Chips de filtres rapides (quartier, type, équipements premium). |
| 2 | **Résultats — carte + liste** | Vue scindée : carte stylisée (zones *fokontany* colorées, étiquettes prix flottantes, toggles de couches sécurité / prix médian / écoles / isochrone) + bottom-sheet de cartes biens triées par compatibilité. |
| 3 | **Détail propriété** (drawer) | Anneau de compatibilité + raisons, estimateur de coût réel détaillé, décomposition du score de confiance. CTA : *Planifier une visite* / *Ajouter au comparatif*. |
| 4 | **Assistant chat IA** | Interface conversationnelle française. Extraction d'intention → chips de filtres. Indicateur de frappe, questions de relance contextuelles, carte de synthèse de match. |
| 5 | **Comparaison côte à côte** | Jusqu'à 3 biens. Tableau : prix affiché, coût réel, prix/m², compatibilité %, confiance, trajet centre, équipements premium. **Meilleure cellule par ligne surlignée.** |
| 6 | **Cold start** | État *« Construction de votre profil… »* avant d'afficher des scores — gère le démarrage à froid avec une barre de progression et des scores explicitement masqués. |

---

## 6. Composants signature

- **Bandeau marché** — cartes horizontales scrollables : quartier, loyer médian, tendance (↑/↓ %).
- **Carte propriété** — bordure or pour le top match, barre de confiance, badge source *« Vu sur N plateformes »*, badge de compatibilité, tags d'équipements verts (présents) / ambre (absents).
- **Score de compatibilité** — anneau navy/or + 3–4 raisons.
- **Estimateur de coût réel** — décomposition ligne à ligne avec total net.
- **Score de confiance** — barre de progression + liste de vérifications cochées.
- **FAB chat** — cercle navy, icône or, bas-droite, ouvre le panneau conversationnel.
- **Barre de comparaison** — apparaît en bas dès 2 biens sélectionnés ; fond navy, CTA or.

---

## 7. Données clés (modèle d'enrichissement)

Chaque bien agrégé porte :

```
bien {
  sources[]          // Avana, OLX, Facebook… (dédoublonnage par empreinte)
  prix_affiche       // Ar / mois
  cout_reel {        // loyer + eau + electricite + gardien + charges
    total            // ligne nette
  }
  compatibilite {    // 0–100, dépend du profil utilisateur
    raisons[]        // ✓ / − explicites
  }
  confiance {        // 0–100, indépendant du profil
    verifications[]  // photos, prix marché, multi-plateforme, ancienneté
  }
  attributs          // ch, surface, étage
  premium[]          // gardien24h, groupe_elec, residence, piscine, fibre…
  geo                // fokontany, isochrone centre
}
```

> **Règle d'or** : la confiance est universelle (calculable dès l'agrégation) ; la compatibilité est personnelle (nécessite un profil). D'où le cold start.

---

## 8. À éviter (anti-objectifs)

- Esthétique immobilière générique (ciels bleus, prix en Comic Sans).
- Surcharge — chaque écran doit rester calme et délibéré.
- Dégradés violets, ombres génériques, patterns d'UI stock.
- Afficher des scores de compatibilité avant d'avoir assez d'interaction (→ cold start).

---

## 9. État de la maquette

Livré sous forme de **canvas comparatif** (`Immo MG.html`) : les 8 écrans posés côte à côte (parcours complet de 6 écrans + 2 variantes), déplaçables, agrandissables en plein écran, exportables.

Réglages d'ambiance intégrés (panneau Tweaks) : couleur d'accent, police des titres, température du fond — voir `DESIGN.md`.

**Hors périmètre de la maquette actuelle** : back-end d'agrégation, NLP réel, vraie carte Mapbox (stylisée ici), authentification, photos réelles (placeholders en place).
