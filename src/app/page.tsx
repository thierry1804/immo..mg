import { Suspense } from "react";
import HomeView from "@/components/HomeView";

export default function HomePage() {
  // HomeView reads search params (deep links from chat / the Carte tab).
  return (
    <Suspense fallback={null}>
      <HomeView />
    </Suspense>
  );
}
