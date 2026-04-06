import { AppShell } from "../../components/app-shell";
import { Skeleton } from "../../components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell title="Courses">
      <Skeleton className="h-40" />
      <Skeleton className="h-32" />
      <Skeleton className="h-56" />
      <Skeleton className="h-48" />
    </AppShell>
  );
}
