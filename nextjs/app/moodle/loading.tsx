import { AppShell } from "../../components/app-shell";
import { Skeleton } from "../../components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell title="Moodle">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </AppShell>
  );
}
