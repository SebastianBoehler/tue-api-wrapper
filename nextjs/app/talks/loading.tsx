import { AppShell } from "../../components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function TalksLoading() {
  return (
    <AppShell title="Talks">
      <Skeleton className="h-36 w-full" />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </AppShell>
  );
}
