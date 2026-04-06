import { AppShell } from "../../components/app-shell";
import { Skeleton } from "../../components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell title="Documents">
      <Skeleton className="h-40" />
      <Skeleton className="h-20" />
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
    </AppShell>
  );
}
