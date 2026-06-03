/**
 * Réinitialise les mots de passe des comptes listés dans STATIC_DEV_ACCESS_ACCOUNTS.
 * Usage : npm run db:sync-dev-passwords
 */
import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { users } from "../src/db/schema";
import { STATIC_DEV_ACCESS_ACCOUNTS } from "../src/lib/dev-access";

const ARGON_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

async function main() {
  for (const account of STATIC_DEV_ACCESS_ACCOUNTS) {
    const hashed = await hash(account.password, ARGON_OPTS);
    const result = await db
      .update(users)
      .set({ hashedPassword: hashed })
      .where(eq(users.email, account.email))
      .returning({ email: users.email, role: users.role });

    if (result.length === 0) {
      console.warn(`⚠ Compte absent : ${account.email} (${account.label})`);
      continue;
    }

    console.log(
      `✓ ${result[0].email} → mot de passe « ${account.password} » (${result[0].role})`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
