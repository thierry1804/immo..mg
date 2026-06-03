import { sql, type SQL } from "drizzle-orm";

// Colonne générée non déclarée dans le schéma Drizzle → référencée en SQL brut.
const SEARCH_VECTOR = sql.raw('"listings"."search_vector"');

/** Texte libre exploitable pour le full-text, ou null. */
export function normalizeTextQuery(q: string | undefined): string | null {
  const t = (q ?? "").trim().replace(/\s+/g, " ");
  return t.length >= 2 ? t : null;
}

/** Expression ts_rank (signal lexical). Le texte doit être pré-validé. */
export function lexRankExpr(text: string): SQL {
  return sql`ts_rank(${SEARCH_VECTOR}, plainto_tsquery('fr_unaccent', ${text}))`;
}

/** Condition de correspondance plein-texte (pour le plancher de pertinence). */
export function textMatchCondition(text: string): SQL {
  return sql`${SEARCH_VECTOR} @@ plainto_tsquery('fr_unaccent', ${text})`;
}
