/** Pulse placeholder matching PropertyCard proportions while listings load. */
export default function ListingSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-line bg-white shadow-card"
      aria-hidden
    >
      <div className="aspect-[16/10] animate-pulse bg-paper-2" />
      <div className="space-y-2.5 p-4">
        <div className="h-4 w-4/5 animate-pulse rounded-md bg-paper-2" />
        <div className="h-3 w-1/2 animate-pulse rounded-md bg-paper-2" />
        <div className="h-5 w-1/3 animate-pulse rounded-md bg-gold-tint" />
        <div className="h-2 w-full animate-pulse rounded-full bg-paper-2" />
      </div>
    </div>
  );
}
