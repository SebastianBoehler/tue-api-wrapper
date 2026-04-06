import { AppShell } from "../../components/app-shell";
import { Skeleton } from "../../components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell title="Agenda">
      <Skeleton className="h-48" />
      <Skeleton className="h-[480px]" />
    </AppShell>
  );
}
