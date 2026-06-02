# Plateforme Immobilière IA — Madagascar
## Document de Spécification Produit v1.0

> **Vision** : L'agrégateur immobilier le plus fiable et le plus intelligent de Madagascar, conçu pour la classe aisée qui exige qualité, rapidité et confiance.

---

## Table des matières

1. [Contexte & Positionnement](#1-contexte--positionnement)
2. [Cible utilisateur](#2-cible-utilisateur)
3. [Stratégie d'agrégation](#3-stratégie-dagrégation)
4. [Architecture fonctionnelle](#4-architecture-fonctionnelle)
5. [Fonctionnalités — Phase 1 (MVP)](#5-fonctionnalités--phase-1-mvp)
6. [Fonctionnalités — Phase 2 (Intelligence)](#6-fonctionnalités--phase-2-intelligence)
7. [Fonctionnalités — Phase 3 (Premium)](#7-fonctionnalités--phase-3-premium)
8. [UX & Design](#8-ux--design)
9. [Architecture technique](#9-architecture-technique)
10. [Modèle économique](#10-modèle-économique)
11. [KPIs](#11-kpis)
12. [Roadmap](#12-roadmap)
13. [Contraintes & Risques](#13-contraintes--risques)

---

## 1. Contexte & Positionnement

### Problème actuel

Le marché immobilier malgache est fragmenté sur plusieurs plateformes disparates (Avana, OLX Madagascar, groupes Facebook, sites d'agences) avec les problèmes suivants :

- **Annonces dupliquées** sur plusieurs plateformes sans centralisation
- **Fraude fréquente** : biens inexistants, avances collectées sans mandat, photos volées
- **Absence de données de marché** fiables et accessibles
- **Qualité d'information faible** : descriptions incomplètes, photos médiocres, prix sans surface
- **Aucune personnalisation** : même expérience pour tout le monde
- **Perte de temps massive** pour un segment dont le temps a de la valeur

### Positionnement

```
Pas une plateforme d'annonces de plus.
Un assistant immobilier intelligent qui agrège, vérifie, enrichit et recommande.
```

| Ce que font les concurrents | Ce que fait cette plateforme |
|---|---|
| Publier des annonces brutes | Agréger + dédupliquer + enrichir |
| Filtres génériques | Recherche conversationnelle en français |
| Prix affiché | Prix normalisé + coût réel estimé |
| Aucune vérification | Score de confiance visible |
| Aucune donnée de marché | Rapport marché temps réel |

---

## 2. Cible utilisateur

### Persona principal — "Le Décideur Pressé"

```
Profil :
- Classe aisée / upper-middle class malgache
- 30–55 ans
- Réside ou cherche à Antananarivo (Ivandry, Ambohijatovo, Ankadivato, Ankorondrano)
- Connexion 4G stable ou fibre
- Smartphone Android ou iPhone récent
- Parle et écrit français couramment
- Revenu mensuel > 3 000 000 Ar ou expatrié / diaspora

Frustrations :
- Perd des heures à parcourir les mêmes annonces sur 5 plateformes
- Ne sait pas si une annonce est sérieuse avant d'appeler
- Manque de données pour négocier un prix
- Critères importants absents des filtres standards (groupe électrogène, sécurité, standing)

Besoins implicites :
- Confiance avant tout
- Discrétion (ne pas exposer son budget publiquement)
- Représentativité sociale du bien
- Réassurance sur l'investissement
```

### Persona secondaire — "L'Investisseur"

```
Profil :
- Cherche à acheter pour louer ou revendre
- A besoin de données de rendement et de tendances de marché
- Prend des décisions rationnelles basées sur des chiffres
- Peut être en diaspora (France, Réunion, Maurice)

Besoin spécifique :
- Rapport de marché par quartier
- Estimation de rendement locatif
- Historique de prix
```

---

## 3. Stratégie d'agrégation

### Principe fondamental

> La plateforme ne demande pas aux propriétaires de publier ici. Elle va chercher les annonces là où elles sont déjà publiées, les centralise, les nettoie, et les enrichit.

### Sources à agréger

| Source | Type | Méthode |
|---|---|---|
| Avana.mg | Site web | Scraping + API si disponible |
| OLX Madagascar | Site web | Scraping |
| Groupes Facebook immo | Réseau social | Facebook Graph API / scraping |
| Sites d'agences locales | Sites web | Scraping ciblé |
| Annonces directes | Formulaire plateforme | Saisie manuelle / propriétaire |

### Pipeline d'ingestion

```
Source externe
     ↓
Scraper / Collecteur (cron job toutes les 2–4h)
     ↓
Normalisation des données (prix → Ar, surface → m², quartier → fokontany)
     ↓
Déduplication (hash photo + adresse + prix + surface)
     ↓
Enrichissement NLP (extraction surface/étage/équipements depuis description)
     ↓
Scoring de confiance automatique
     ↓
Indexation Elasticsearch
     ↓
Affichage plateforme
```

### Règles de déduplication

Un doublon est détecté si **2 critères ou plus** parmi les suivants correspondent :
- Même hash de photo principale (perceptual hash)
- Même prix ± 5%
- Même quartier/fokontany
- Descriptions avec similarité cosinus > 0.85

**Action :** fusion en une fiche unifiée avec badge "Vu sur N plateformes" et liens vers les sources.

---

## 4. Architecture fonctionnelle

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│                    UTILISATEUR                          │
│         (recherche, swipe, comparaison, favoris)        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  INTERFACE                              │
│   Recherche conversationnelle │ Carte │ Liste │ Fiches  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    API GATEWAY                          │
└───┬──────────┬──────────┬──────────┬────────────────────┘
    │          │          │          │
┌───▼──┐  ┌───▼──┐  ┌────▼──┐  ┌────▼──────┐
│Search│  │ User │  │ Market│  │Aggregator │
│Engine│  │ Profile│ │ Data  │  │ Service   │
└───┬──┘  └───┬──┘  └────┬──┘  └────┬──────┘
    │          │          │          │
┌───▼──────────▼──────────▼──────────▼──────┐
│              BASE DE DONNÉES              │
│   PostgreSQL │ Elasticsearch │ Redis      │
└───────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  COUCHE IA                              │
│  NLP Search │ Recommandation │ Fraude │ Vision │ Mémoire│
└─────────────────────────────────────────────────────────┘
```

---

## 5. Fonctionnalités — Phase 1 (MVP)

> **Objectif Phase 1** : Être la plateforme avec les annonces les plus complètes et les plus fiables de Madagascar. Pas encore d'IA avancée — de la rigueur et de la qualité de données.

### 5.1 Agrégation & Fiche unifiée

**Description**
Chaque bien a une fiche unique, même s'il est publié sur 5 plateformes.

**Contenu de la fiche**

```
IDENTITÉ DU BIEN
- Titre normalisé
- Type : Appartement / Maison / Villa / Studio / Bureau / Terrain
- Transaction : Location / Vente

LOCALISATION
- Quartier (fokontany)
- Ville
- Carte approximative (pas d'adresse exacte pour la confidentialité)
- Temps estimé vers : centre-ville, université, aéroport (calculé via API)

PRIX
- Prix affiché (Ar/mois pour location, Ar pour vente)
- Prix normalisé au m² si surface disponible
- Estimation coût réel mensuel (voir 5.4)

CARACTÉRISTIQUES
- Surface (m²)
- Nombre de pièces / chambres / SDB
- Étage / Nombre d'étages
- Meublé / Non meublé

ÉQUIPEMENTS PREMIUM (critères classe aisée)
- Gardien 24h ✓/✗
- Groupe électrogène ✓/✗
- Citerne / eau autonome ✓/✗
- Parking couvert ✓/✗
- Résidence fermée / sécurisée ✓/✗
- Accès bitumé ✓/✗
- Climatisation ✓/✗
- Internet fibré ✓/✗

MÉDIAS
- Photos (toutes sources agrégées, dédupliquées)
- Vidéo si disponible

PROVENANCE
- Badge "Vu sur N plateformes"
- Liens vers sources originales
- Date de première publication
- Date de dernière mise à jour

SCORE DE CONFIANCE (voir 5.3)
```

### 5.2 Recherche & Filtres

**Recherche textuelle**
- Recherche plein texte sur titre + description + quartier
- Autocomplétion sur les noms de quartiers et fokontany
- Correction orthographique (Ankorondrano vs Ankorndrano)

**Filtres essentiels**
```
Transaction    : Location | Vente
Type de bien   : Appartement | Maison | Villa | Studio | Autre
Budget         : Slider min–max (en Ar)
Quartier       : Multi-sélection par liste de fokontany
Surface        : Slider min–max (m²)
Équipements    : Cases à cocher (gardien, groupe électrogène, parking, etc.)
Meublé         : Oui | Non | Indifférent
Fraîcheur      : Publié depuis < 7j | < 30j | Tout
```

**Tri**
- Pertinence (défaut)
- Prix croissant / décroissant
- Surface croissante / décroissante
- Date de publication (plus récent)
- Score de confiance

### 5.3 Score de confiance

> La question numéro 1 de l'utilisateur cible : "Est-ce que cette annonce est sérieuse ?"

**Calcul automatique du score (0–100)**

| Critère | Poids | Détail |
|---|---|---|
| Photos originales détectées | 20 pts | Pas de hash identique à d'autres annonces |
| Nombre de photos ≥ 4 | 10 pts | Couverture visuelle suffisante |
| Surface mentionnée | 10 pts | Donnée présente et cohérente avec le prix |
| Quartier précis identifié | 10 pts | Fokontany reconnu dans la base |
| Annonce récente (< 30 jours) | 10 pts | Fraîcheur de l'annonce |
| Prix cohérent avec le marché | 15 pts | Dans l'intervalle ± 2σ du prix médian du quartier |
| Présent sur 1+ plateforme vérifiée | 10 pts | Cross-validation des sources |
| Numéro de contact vérifié | 15 pts | Numéro Telma/Airtel/Orange valide, non signalé |

**Affichage**

```
[SCORE DE CONFIANCE]
████████░░  78/100

✓ Photos originales
✓ Prix cohérent avec le marché
✓ Quartier identifié
⚠ Annonce publiée il y a 45 jours
✗ Surface non renseignée
```

**Flags automatiques de vigilance**

- 🚨 "Prix anormalement bas pour ce quartier" (< 40% du prix médian)
- ⚠️ "Annonce identique détectée sur 3+ plateformes avec des prix différents"
- ⚠️ "Photos utilisées dans d'autres annonces"
- ℹ️ "Annonce non mise à jour depuis 60 jours"

### 5.4 Calculateur de coût réel

**Problème** : Le loyer affiché ne reflète jamais le coût réel à Madagascar.

**Formule**

```
Coût réel estimé = Loyer de base
                 + Eau JIRAMA estimée (selon surface)
                 + Électricité JIRAMA estimée (selon surface)
                 + Gardien (si applicable, ~ 200 000–400 000 Ar/mois)
                 + Charges copropriété estimées
                 + Provision groupe électrogène (carburant)
```

**Affichage dans la fiche**

```
Loyer affiché         : 1 500 000 Ar/mois
──────────────────────────────────────────
+ Eau estimée         :    80 000 Ar/mois
+ Électricité estimée :   150 000 Ar/mois
+ Gardien             :   300 000 Ar/mois
+ Charges estimées    :    70 000 Ar/mois
──────────────────────────────────────────
COÛT RÉEL ESTIMÉ      : 2 100 000 Ar/mois

ℹ Ces estimations sont basées sur des moyennes
  pour ce type de bien dans ce quartier.
```

### 5.5 Carte intelligente

**Couches d'information disponibles**

```
Couche de base
  → Fokontany colorés (prix médian par zone)
  → Points d'intérêt : marchés, hôpitaux, écoles, universités, centres commerciaux

Couche Mobilité
  → Temps de trajet estimé depuis un point de départ personnalisé
  → Axes de trafic (statique : heures de pointe connues)
  → Stations taxi-brousse principales

Couche Sécurité & Standing
  → Quartiers selon niveau de sécurité (données agrégées / community-sourced)
  → Zones résidentielles fermées identifiées
```

**Interaction**

- Clic sur un bien → aperçu rapide sans quitter la carte (photos, prix, score confiance)
- Dessin de zone personnalisée : "Je veux chercher uniquement dans cette zone"
- Isochrone : "Affiche tous les biens à moins de 20 min de ce point"

---

## 6. Fonctionnalités — Phase 2 (Intelligence)

> **Objectif Phase 2** : Activer l'IA sur la base de données comportementales accumulées en Phase 1. Ne rien afficher de fictif.

### 6.1 Recherche conversationnelle (NLP français)

**Principe**
Interface de chat en français qui remplace ou complète les filtres. Langue cible : français (y compris français malgache courant).

**Exemples d'entrées supportées**

```
"Je cherche une villa sécurisée à Ivandry, 3 chambres minimum,
 budget autour de 3 millions, avec groupe électrogène"

"Appartement moderne pour jeune couple, proche Ankorondrano,
 pas plus de 1.5M, meublé de préférence"

"Terrain à vendre sur la RN1, min 500m², accès bitumé"
```

**Extraction d'entités**

```json
{
  "type": "villa",
  "transaction": "location",
  "quartier": ["Ivandry"],
  "chambres_min": 3,
  "budget_max": 3000000,
  "equipements": ["groupe_electrogene", "securise"],
  "style": "moderne",
  "meuble": "preference"
}
```

**Dialogue de clarification** (uniquement si ambiguïté réelle)

```
IA : "Vous cherchez à Ivandry ou les quartiers adjacents
     (Ambohijatovo, Ankadivato) sont aussi OK ?"

IA : "Budget autour de 3M : je montre jusqu'à 3,5M ?"
```

**Technologie recommandée**
- GPT-4o (via API OpenAI) avec prompt système structuré pour l'extraction d'entités
- Fallback : Mistral large (moins cher, qualité proche sur le français)
- Langue : français uniquement en v1, malgache en roadmap v2

### 6.2 Score de compatibilité personnalisé

> Ne s'affiche qu'après 5+ interactions utilisateur. Avant : affichage du score de confiance seul.

**Variables utilisateur (apprises progressivement)**

```json
{
  "budget_habituel": 2500000,
  "quartiers_consultes": ["Ivandry", "Ambohijatovo", "Ankorondrano"],
  "types_preferes": ["villa", "appartement"],
  "equipements_importants": ["gardien", "parking", "groupe_electrogene"],
  "surface_min_implicite": 80,
  "biens_ignores": ["studio", "non_meuble"],
  "clics_sur_photos_luminosite": true
}
```

**Formule de score**

```
Score compatibilité =
  0.30 × Adéquation budget (ratio budget/prix affiché)
+ 0.25 × Localisation (quartier dans liste consultée + distance point d'intérêt clé)
+ 0.20 × Équipements (intersection équipements voulus / équipements présents)
+ 0.15 × Type et surface (type préféré + surface dans intervalle habituel)
+ 0.10 × Comportement historique (biens similaires consultés longuement)
```

**Affichage**

```
Compatibilité : 91%

Pourquoi ce score ?
✓ Budget respecté (1.8M vs votre habituel 2M)
✓ Quartier Ivandry (votre préféré)
✓ Parking couvert et gardien présents
✓ Surface 120m² (dans votre fourchette habituelle)
− Pas de groupe électrogène mentionné
```

### 6.3 Profil et mémoire utilisateur

**Données mémorisées**

```json
{
  "preferences_declarees": {
    "transaction": "location",
    "budget_max": 3000000,
    "quartiers": ["Ivandry", "Ambohijatovo"],
    "equipements_must_have": ["gardien_24h", "parking"]
  },
  "preferences_inferees": {
    "style": "moderne",
    "luminosite": "importante",
    "calme": true,
    "surface_min": 90
  },
  "historique": {
    "biens_consultes": [...],
    "favoris": [...],
    "biens_ignores": [...],
    "recherches_passees": [...]
  },
  "alertes_actives": [...]
}
```

**Notifications intelligentes**

```
"Une villa à Ivandry vient d'être publiée.
 Elle correspond à 94% de vos préférences.
 Prix : 2 800 000 Ar/mois — dans votre budget."

→ [Voir maintenant]
```

**Règles d'alerte**
- Nouveau bien avec score compatibilité > 85% → notification push/email immédiate
- Baisse de prix sur un favori → notification dans les 24h
- Bien favori non mis à jour depuis 60 jours → alerte "Disponibilité à vérifier"

### 6.4 Rapport de marché immobilier

> Fonctionnalité rendue possible par l'agrégation de données. Exclusivité de la plateforme.

**Données disponibles**

```
Par quartier / fokontany :
- Prix médian location (Ar/m²/mois)
- Prix médian vente (Ar/m²)
- Évolution sur 3, 6, 12 mois
- Nombre d'annonces actives
- Délai moyen de mise en location estimé
- Tension locative (ratio demande/offre proxied par volume de consultations)

Par type de bien :
- Distribution des prix
- Surface médiane
- Équipements les plus fréquents

Indicateurs globaux :
- Top 5 quartiers les plus demandés ce mois
- Évolution des prix ville d'Antananarivo
- Saisonnalité observée
```

**Accès**
- Résumé public : gratuit (données agrégées non détaillées)
- Rapport complet par quartier : accès Premium (voir modèle économique)

---

## 7. Fonctionnalités — Phase 3 (Premium)

> **Objectif Phase 3** : Monétisation via services à valeur ajoutée. L'IA est mature, les données sont riches.

### 7.1 Analyse visuelle des photos

**Analyse automatique de chaque photo**

```
Luminosité         : Faible | Moyenne | Forte | Très lumineuse
État général       : Neuf | Bon état | À rénover | Vétuste
Style architectural : Moderne | Classique | Colonial | Mixte
Espaces détectés   : Salon | Cuisine | Chambre | SDB | Terrasse | Jardin
Éléments premium   : Piscine | Carrelage marbre | Plafond haut | Grande baie vitrée
Défauts visibles   : Humidité | Peinture écaillée | Plomberie apparente

Résumé automatique :
"Appartement lumineux au style moderne, bon état général.
 Carrelage récent, grande fenêtre côté jardin.
 Cuisine ouverte sur salon. Idéal jeune couple ou personne seule."
```

**Technologie** : GPT-4 Vision ou Gemini Vision Pro

### 7.2 Home staging virtuel léger

**Cas d'usage ciblé**
Bien de standing vendu vide ou partiellement meublé, acheteur qui veut se projeter.

**Fonctionnement**
1. Upload photo de la pièce vide ou semi-vide
2. Sélection du style : Moderne / Classique / Minimaliste / Colonial
3. Génération de la version meublée via modèle diffusion (SDXL inpaint ou service tiers)
4. Comparaison avant/après sur la fiche

**Disponibilité** : Option payante pour les vendeurs (amélioration d'annonce) ou pour les acheteurs (service de projection).

### 7.3 Conciergerie immobilière

**Services intégrés à la plateforme**

| Service | Description | Modèle |
|---|---|---|
| Vérification de disponibilité | Un agent partenaire confirme que le bien est toujours disponible avant visite | Inclus Premium |
| Prise de RDV visite | Directement depuis la fiche, créneau confirmé | Inclus Premium |
| Vérification titre foncier | Service externalisé à un notaire partenaire | Payant à la demande |
| Rédaction contrat de bail | Modèle de contrat standardisé, personnalisé et téléchargeable | Payant à la demande |
| Mise en relation notaire | Réseau de notaires partenaires pour transaction | Commission |

### 7.4 Espace investisseur

**Pour le persona "Investisseur"**

```
Par bien mis en favori ou consulté :
- Rendement locatif brut estimé
  (prix achat / loyer médian du quartier × 12)
- Comparaison rendement vs quartiers similaires
- Projection valorisation sur 3–5 ans (basée sur tendance observée)
- Temps de retour sur investissement estimé

Alertes investisseur :
- "Ce bien a un rendement brut estimé à 8.2%, supérieur
   à la médiane du quartier (6.1%)"
```

---

## 8. UX & Design

### 8.1 Principes directeurs

```
1. CONFIANCE D'ABORD
   Chaque élément d'interface doit réduire l'incertitude.
   Le score de confiance est visible en permanence.

2. STANDING ASSUMÉ
   Design premium, sobre, pas de couleurs criardes.
   Typographie claire, espaces généreux, photos en grand format.

3. RAPIDITÉ PERÇUE
   L'utilisateur ne doit jamais attendre sans feedback.
   Skeleton screens, lazy loading progressif.

4. MOBILE-FIRST PREMIUM
   Conçu pour iPhone/Android haut de gamme avec 4G stable.
   PWA pour usage offline des fiches déjà consultées.
```

### 8.2 Palette & Identité visuelle

```
Couleurs principales :
- Fond         : #FAFAF8 (blanc cassé chaud)
- Texte        : #1A1A1A (presque noir)
- Accent       : #1B4F72 (bleu marine profond — confiance, sérieux)
- Accent 2     : #D4AC0D (or discret — premium, standing)
- Succès       : #1E8449 (vert confiance)
- Alerte       : #E74C3C (rouge vigilance)
- Neutre       : #7F8C8D (gris texte secondaire)

Typographie :
- Titres       : Inter SemiBold
- Corps        : Inter Regular
- Données      : JetBrains Mono (prix, scores, chiffres)

Iconographie :
- Style        : Lucide Icons (ligne fine, moderne)
- Taille min   : 20px sur mobile
```

### 8.3 Navigation principale

```
Tab bar (mobile) :
[🔍 Rechercher] [🗺️ Carte] [❤️ Favoris] [📊 Marché] [👤 Profil]

Header (desktop) :
Logo | Recherche conversationnelle (centre) | Alertes | Profil
```

### 8.4 Composants clés

**Carte de bien (list view)**

```
┌─────────────────────────────────────┐
│ [PHOTO PRINCIPALE]           [92%]  │  ← Score compatibilité
│                          CONFIANCE  │
│                              [78]   │  ← Score confiance
├─────────────────────────────────────┤
│ Villa F4 — Ivandry                  │
│ 2 800 000 Ar/mois                   │
│ ~3 200 000 Ar coût réel estimé      │
│                                     │
│ 🛏 4  🚿 2  📐 150m²               │
│ ✓ Gardien  ✓ Parking  ✓ Groupe élec │
│                                     │
│ 📍 Ivandry · Publié il y a 3 jours  │
│ 👁 Vu sur 2 plateformes             │
└─────────────────────────────────────┘
```

**Aperçu rapide (hover / long press)**

```
Sans ouvrir la fiche :
- Galerie photos swipable
- Prix + coût réel
- Score confiance + score compatibilité
- 3 critères principaux
- Bouton [Voir la fiche] [Ajouter aux favoris]
```

**Comparaison côte à côte**

```
Jusqu'à 3 biens comparables simultanément.

| Critère           | Bien A      | Bien B      | Bien C      |
|-------------------|-------------|-------------|-------------|
| Prix              | 2 800 000   | 3 200 000   | 2 500 000   |
| Coût réel estimé  | 3 200 000   | 3 500 000   | 3 100 000   |
| Surface           | 150 m²      | 180 m²      | 120 m²      |
| Prix/m²           | 18 667      | 17 778      | 20 833      |
| Compatibilité     | 92%         | 87%         | 78%         |
| Confiance         | 78/100      | 91/100      | 65/100      |
| Gardien 24h       | ✓           | ✓           | ✗           |
| Groupe électro.   | ✓           | ✗           | ✓           |
| Parking couvert   | ✓           | ✓           | ✓           |
| Temps centre-ville| 12 min      | 18 min      | 8 min       |
```

**Swipe intelligent (mode exploration)**

```
Mode optionnel d'exploration rapide.
Swipe droite = intéressé → apprentissage préférences
Swipe gauche = pas intéressé → apprentissage préférences
Tap = ouvrir la fiche

Feedback après 10 swipes :
"Vous semblez préférer les villas avec jardin dans les
 quartiers résidentiels du nord. On affine votre recherche ?"
```

---

## 9. Architecture technique

### 9.1 Stack recommandé

**Frontend**

```
Framework     : Next.js 14 (App Router)
Styling       : Tailwind CSS + shadcn/ui
Carte         : Mapbox GL JS (meilleure couverture Tana que Google Maps)
Animations    : Framer Motion (usage sobre — transitions, pas de fioritures)
State         : Zustand (global) + React Query (server state)
PWA           : next-pwa (cache offline des fiches consultées)
```

**Backend**

```
API           : Node.js + NestJS (TypeScript)
Auth          : JWT + refresh token / OAuth2 (Google Sign-In)
Base données  : PostgreSQL (données structurées)
Recherche     : Elasticsearch (full-text + géo)
Cache         : Redis (résultats de recherche, sessions)
Files         : BullMQ (jobs scraping, notifications)
Stockage      : AWS S3 ou Cloudflare R2 (photos)
CDN           : Cloudflare (images optimisées WebP auto)
```

**Agrégation / Scraping**

```
Orchestration : Playwright (scraping JS-heavy) + Cheerio (scraping léger)
Scheduler     : Cron via BullMQ (toutes les 2–4h par source)
Proxy         : Rotation de proxies résidentiels (anti-blocage)
Dédup         : pHash (photos) + similarité cosinus (texte via embeddings)
```

**IA**

```
LLM Search    : OpenAI GPT-4o (extraction d'entités depuis recherche naturelle)
Fallback LLM  : Mistral Large (coût réduit pour requêtes simples)
Vision        : GPT-4 Vision (analyse photos)
Embeddings    : OpenAI text-embedding-3-small (déduplication texte, similarité)
Recommandation: Collaborative filtering custom (Python + scikit-learn)
```

**Infrastructure**

```
Hébergement   : AWS (EC2 + RDS + ElastiCache) ou Railway/Render (v1 moins cher)
DNS/CDN       : Cloudflare
Monitoring    : Datadog ou Sentry
CI/CD         : GitHub Actions
```

### 9.2 Modèle de données principal

**Table `properties`**

```sql
CREATE TABLE properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     VARCHAR(255),        -- ID source originale
  source          VARCHAR(50),         -- 'avana', 'olx', 'facebook', 'direct'
  source_url      TEXT,

  -- Identité
  title           TEXT,
  description     TEXT,
  property_type   VARCHAR(50),         -- 'villa', 'appartement', 'studio', 'terrain'
  transaction     VARCHAR(20),         -- 'location', 'vente'

  -- Prix
  price           BIGINT,              -- En Ariary
  price_per_sqm   BIGINT,              -- Calculé
  estimated_real_cost BIGINT,          -- Coût réel estimé

  -- Localisation
  fokontany       VARCHAR(100),
  district        VARCHAR(100),
  city            VARCHAR(100),
  latitude        DECIMAL(10, 7),
  longitude       DECIMAL(10, 7),

  -- Caractéristiques
  surface_sqm     INTEGER,
  rooms           INTEGER,
  bedrooms        INTEGER,
  bathrooms       INTEGER,
  floor           INTEGER,
  furnished       BOOLEAN,

  -- Équipements premium
  has_guard       BOOLEAN,
  has_generator   BOOLEAN,
  has_cistern     BOOLEAN,
  has_parking     BOOLEAN,
  gated_community BOOLEAN,
  paved_access    BOOLEAN,
  has_ac          BOOLEAN,
  has_fiber       BOOLEAN,
  has_pool        BOOLEAN,

  -- Scores
  confidence_score INTEGER,            -- 0–100
  fraud_flags     JSONB,               -- Flags détectés

  -- Métadonnées
  is_duplicate    BOOLEAN DEFAULT FALSE,
  canonical_id    UUID,                -- ID du bien parent si doublon
  first_seen_at   TIMESTAMP,
  last_seen_at    TIMESTAMP,
  last_updated_at TIMESTAMP,
  is_active       BOOLEAN DEFAULT TRUE,

  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Index géo
CREATE INDEX idx_properties_geo ON properties USING GIST (
  ll_to_earth(latitude, longitude)
);

-- Index full-text
CREATE INDEX idx_properties_fts ON properties USING GIN (
  to_tsvector('french', title || ' ' || COALESCE(description, ''))
);
```

**Table `user_profiles`**

```sql
CREATE TABLE user_profiles (
  id                UUID PRIMARY KEY,
  user_id           UUID REFERENCES users(id),

  -- Préférences déclarées
  declared_budget_max     BIGINT,
  declared_transaction    VARCHAR(20),
  declared_quartiers      TEXT[],
  declared_must_have      TEXT[],        -- Équipements indispensables

  -- Préférences inférées (ML)
  inferred_style          VARCHAR(50),
  inferred_min_surface    INTEGER,
  inferred_prefers_calm   BOOLEAN,
  inferred_quartiers      TEXT[],
  preferences_vector      vector(384),   -- Embedding profil (pgvector)

  -- Alertes
  alerts_enabled    BOOLEAN DEFAULT TRUE,
  alert_threshold   INTEGER DEFAULT 85,  -- Score compatibilité min pour alerte

  updated_at        TIMESTAMP DEFAULT NOW()
);
```

### 9.3 API endpoints principaux

```
# Recherche
GET  /api/properties?q=...&filters=...     Recherche classique + filtres
POST /api/search/conversational            Recherche NLP (body: {query: string})
GET  /api/properties/:id                   Fiche détaillée
GET  /api/properties/:id/similar          Biens similaires

# Marché
GET  /api/market/summary                   Vue globale marché
GET  /api/market/by-fokontany/:fokontany  Données par quartier
GET  /api/market/price-history             Historique prix

# Utilisateur
POST /api/auth/register
POST /api/auth/login
GET  /api/user/profile                     Profil + préférences
PUT  /api/user/profile                     Mise à jour préférences
GET  /api/user/favorites                   Favoris
POST /api/user/favorites/:id              Ajouter favori
GET  /api/user/alerts                      Alertes actives
POST /api/user/alerts                      Créer alerte

# Comparaison
POST /api/compare                          Body: {ids: [id1, id2, id3]}
```

---

## 10. Modèle économique

### Principe directeur

> Pas de commission directe sur transaction (contournable).
> Monétiser la valeur ajoutée que les concurrents ne peuvent pas offrir.

### Sources de revenus

**1. Abonnement Propriétaire / Agence**

```
Gratuit (Free)
- 2 annonces actives
- Visibilité standard
- Pas de mise en avant

Pro — 50 000 Ar/mois
- Annonces illimitées
- Badge "Propriétaire vérifié"
- Priorité dans les résultats
- Accès aux statistiques (vues, contacts)
- Réponse aux avis

Agence — 200 000 Ar/mois
- Tout Pro +
- Page agence dédiée
- Portfolio de biens
- Leads entrants qualifiés
- Export des données
```

**2. Mise en avant d'annonce**

```
Boost 7 jours     : 20 000 Ar  → Apparaît en premier dans sa catégorie
Boost 30 jours    : 60 000 Ar  → + badge "Mise en avant"
Pack photo        : 80 000 Ar  → Shooting photo professionnel par partenaire
Pack staging      : 120 000 Ar → Home staging virtuel (3 pièces)
```

**3. Accès Premium Acheteur/Locataire**

```
Premium — 30 000 Ar/mois
- Rapport marché complet (tous quartiers)
- Alertes illimitées (seuil personnalisable)
- Score compatibilité activé
- Comparaison jusqu'à 5 biens simultanément
- Historique de prix par bien
- Estimation rendement locatif

Gratuit : résumé marché, 3 alertes max, comparaison 3 biens
```

**4. Services à la demande (Conciergerie)**

```
Vérification titre foncier  : 150 000 Ar
Rédaction contrat de bail   : 80 000 Ar
Mise en relation notaire    : Commission 0.5% sur transaction
Vérification disponibilité  : Inclus Premium acheteur
```

**5. Données B2B (Phase 3)**

```
Rapport marché institutionnel : Banques, promoteurs, fonds d'investissement
Licence données anonymisées   : Chercheurs, institutions
Prix : sur devis
```

---

## 11. KPIs

### Acquisition

| Métrique | Cible M3 | Cible M6 | Cible M12 |
|---|---|---|---|
| Biens agrégés actifs | 500 | 2 000 | 5 000 |
| Utilisateurs inscrits | 200 | 1 000 | 5 000 |
| Visiteurs uniques / mois | 1 000 | 5 000 | 20 000 |
| Sources agrégées | 3 | 5 | 8 |

### Engagement

| Métrique | Cible |
|---|---|
| Temps moyen par session | > 4 min |
| Pages vues par session | > 5 |
| Taux de retour à 30 jours | > 35% |
| Taux d'inscription visiteur → compte | > 15% |
| Alertes actives / utilisateur inscrit | > 2 |

### Qualité IA

| Métrique | Cible |
|---|---|
| Taux de clic sur recommandations (vs liste standard) | > 40% lift |
| Satisfaction score de confiance (enquête) | > 4/5 |
| Taux de faux positifs fraude | < 5% |
| Précision extraction NLP (entités correctes) | > 90% |

### Business

| Métrique | Cible M6 | Cible M12 |
|---|---|---|
| Abonnés Pro/Agence | 10 | 50 |
| Abonnés Premium acheteur | 20 | 200 |
| MRR | 1 000 000 Ar | 8 000 000 Ar |
| NPS | > 40 | > 55 |

---

## 12. Roadmap

### Phase 1 — Fondations (M1–M4)

```
M1 :
□ Scraping Avana + OLX Madagascar
□ Pipeline normalisation / déduplication
□ Base de données + API de base
□ Fiche bien unifiée (front)
□ Recherche textuelle + filtres

M2 :
□ Score de confiance v1
□ Calculateur coût réel
□ Carte Mapbox avec fokontany
□ Compte utilisateur + favoris
□ Aperçu rapide hover/long press

M3 :
□ Alertes de nouveaux biens (email)
□ Scraping Facebook groups
□ Déduplication v2 (cross-plateformes)
□ Comparaison côte à côte

M4 :
□ PWA + cache offline
□ Dashboard propriétaire (Free + Pro)
□ Rapport marché v1 (données agrégées)
□ Optimisations SEO
```

### Phase 2 — Intelligence (M5–M8)

```
M5 :
□ Recherche conversationnelle NLP (GPT-4o)
□ Profil utilisateur + préférences déclarées

M6 :
□ Score compatibilité v1 (préférences déclarées uniquement)
□ Swipe intelligent + apprentissage implicite
□ Notifications push

M7 :
□ Score compatibilité v2 (préférences inférées)
□ Rapport marché v2 (par fokontany, historique)
□ Analyse photos automatique (GPT Vision)

M8 :
□ Abonnement Premium acheteur
□ Alertes intelligentes (seuil compatibilité)
□ Optimisation moteur de recommandation
```

### Phase 3 — Premium (M9–M12)

```
M9–M10 :
□ Home staging virtuel
□ Conciergerie : vérification disponibilité + RDV
□ Espace investisseur (rendement, projection)

M11–M12 :
□ Partenariats notaires + contrat de bail
□ Rapport marché institutionnel (B2B)
□ Expansion sources (régions hors Tana)
□ API publique pour agences partenaires
```

---

## 13. Contraintes & Risques

### Risques techniques

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Blocage scraping par les sources | Élevée | Élevé | Rotation proxies, user-agents, respect robots.txt, contacte les plateformes pour partenariat |
| Qualité des données sources très faible | Élevée | Moyen | Pipeline d'enrichissement NLP, flags de qualité visibles |
| Couverture GPS/carte insuffisante sur Tana | Moyenne | Moyen | Couche fokontany dessinée manuellement + Mapbox custom |
| Coût API OpenAI trop élevé à l'échelle | Moyenne | Moyen | Fallback Mistral, cache des requêtes similaires, batching |

### Risques produit

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Fraude importée des sources agrégées | Élevée | Élevé | Score de confiance visible + flags + disclaimer légal |
| Score compatibilité perçu comme inventé | Moyenne | Moyen | Ne pas afficher avant 5+ interactions, expliquer systématiquement |
| Résistance des plateformes sources (C&D) | Moyenne | Élevé | Contacter pour partenariat dès M2, préparer réponse juridique |
| Cold start : trop peu de biens au lancement | Élevée | Élevé | Priorité Phase 1 = masse critique de biens avant acquisition utilisateurs |

### Risques business

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Propriétaires qui contournent la plateforme | Élevée | Moyen | Valeur ajoutée côté vendeur (visibilité, stats, leads qualifiés) |
| Marché trop petit pour le segment cible | Faible | Élevé | Valider avec 50 entretiens utilisateurs avant M1 |
| Modèle économique qui ne convertit pas | Moyenne | Élevé | Gratuit généreux en v1, payant sur la valeur démontrée |

### Contraintes légales

```
□ Vérifier légalité du scraping pour chaque source (CGU)
□ RGPD-like : données personnelles des annonceurs (numéros de téléphone)
  → Anonymisation ou opt-out possible
□ Mention claire que les annonces proviennent de sources tierces
□ Disclaimer sur le calculateur de coût réel (estimation, pas garantie)
□ Responsabilité limitée sur la fraude (filtrée mais non garantie)
```

---

*Document maintenu par l'équipe Produit — Version 1.0*
*Prochaine révision : après validation des entretiens utilisateurs Phase 1*
