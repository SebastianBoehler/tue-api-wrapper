import { AppShell } from "../components/app-shell";
import { Skeleton } from "../components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell title="Overview">
      <Skeleton className="h-40" />
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-3">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-48" />
          <Skeleton className="h-40" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-56" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </AppShell>
  );
}
