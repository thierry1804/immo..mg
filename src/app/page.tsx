import { Suspense } from "react";
import { eq } from "drizzle-orm";
import HomeView from "@/components/HomeView";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";

export default async function HomePage() {
  const { user } = await getCurrentSession();
  let hasProfile = false;
  if (user) {
    const rows = await db
      .select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);
    hasProfile = rows.length > 0;
  }

  return (
    <Suspense fallback={null}>
      <HomeView hasProfile={hasProfile} />
    </Suspense>
  );
}
