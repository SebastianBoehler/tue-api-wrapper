import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { KufTrainingOccupancy } from "../lib/product-types";

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function KufOccupancyCard({ occupancy }: { occupancy: KufTrainingOccupancy }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardDescription>Hochschulsport KuF</CardDescription>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="size-5" />
            Kraft und Fitnesshalle
          </CardTitle>
        </div>
        <CardAction>
          <Button variant="outline" size="xs" asChild>
            <a href={occupancy.source_url} target="_blank" rel="noreferrer">
              Open live count
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <p className="text-5xl font-semibold tracking-tight">{occupancy.count}</p>
          <p className="pb-2 text-sm text-muted-foreground">currently training</p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Updated {formatUpdatedAt(occupancy.retrieved_at)} from the official Hochschulsport counter.
        </p>
      </CardContent>
    </Card>
  );
}
