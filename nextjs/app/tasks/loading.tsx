import { AppShell } from "../../components/app-shell";
import { Skeleton } from "../../components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell title="Tasks">
      <Skeleton className="h-20" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </AppShell>
  );
}
