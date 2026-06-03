import { sql, type SQL } from "drizzle-orm";
import { listings } from "@/db/schema";

export function titleExclusionCondition(
  excludeTitleContains?: string,
): SQL | undefined {
  if (!excludeTitleContains?.trim()) return undefined;
  const pattern = `%${excludeTitleContains.trim()}%`;
  return sql`${listings.title} NOT ILIKE ${pattern}`;
}
