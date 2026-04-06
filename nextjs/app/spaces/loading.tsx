import { AppShell } from "../../components/app-shell";
import { Skeleton } from "../../components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell title="Learning Spaces">
      <Skeleton className="h-24" />
      <Skeleton className="h-72" />
    </AppShell>
  );
}
