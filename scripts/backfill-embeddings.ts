import { eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { listings } from "@/db/schema";
import { buildEmbeddingInput, embed, EMBEDDING_MODEL } from "@/lib/llm/embeddings";

async function main() {
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      amenities: listings.amenities,
    })
    .from(listings)
    .where(isNull(listings.embedding));
  console.log(`À traiter : ${rows.length}`);
  let done = 0;
  for (const r of rows) {
    const vec = await embed(buildEmbeddingInput(r));
    if (!vec) {
      console.warn(`skip ${r.id} (pas d'embedding)`);
      continue;
    }
    await db
      .update(listings)
      .set({ embedding: vec, embeddingModel: EMBEDDING_MODEL })
      .where(eq(listings.id, r.id));
    done++;
    if (done % 20 === 0) console.log(`${done}/${rows.length}`);
  }
  console.log(`Terminé : ${done}/${rows.length}`);
  process.exit(0);
}
main();
