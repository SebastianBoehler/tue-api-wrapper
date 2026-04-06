import { AppShell } from "../../../components/app-shell";
import { Skeleton } from "../../../components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell title="Course Detail">
      <Skeleton className="h-64" />
    </AppShell>
  );
}
