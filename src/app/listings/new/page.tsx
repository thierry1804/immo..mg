import { redirect } from "next/navigation";
import ListingForm from "@/components/ListingForm";
import { getCurrentSession } from "@/lib/auth";

export default async function NewListingPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Publier une annonce</h1>
      <ListingForm />
    </div>
  );
}
