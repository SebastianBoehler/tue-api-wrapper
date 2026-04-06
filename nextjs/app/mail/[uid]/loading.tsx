import { AppShell } from "../../../components/app-shell";
import { Skeleton } from "../../../components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell title="Message">
      <Skeleton className="h-36" />
      <Skeleton className="h-64" />
    </AppShell>
  );
}
