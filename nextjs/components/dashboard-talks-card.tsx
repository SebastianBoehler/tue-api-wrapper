import type { Route } from "next";
import Link from "next/link";
import { Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListRow, ListRows } from "./list-row";
import type { TalksPanel } from "../lib/dashboard-talk-types";

function formatTalkDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time pending";
  }
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function DashboardTalksCard({ talks }: { talks: TalksPanel }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mic className="size-4 text-primary" />Talks</CardTitle>
        <CardAction>
          <Button variant="outline" size="xs" asChild>
            <Link href={"/talks" as Route}>All talks</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {talks.available ? (
          <ListRows>
            {talks.items.slice(0, 4).map((talk) => (
              <ListRow key={talk.id} href={`/talks?talkId=${talk.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{talk.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {talk.speaker_name ?? talk.location ?? "Speaker pending"}
                    </p>
                    {talk.tags.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {talk.tags.slice(0, 2).map((tag) => (
                          <Badge key={`${talk.id}-${tag.id}`} variant="secondary">{tag.name}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">{formatTalkDate(talk.timestamp)}</time>
                </div>
              </ListRow>
            ))}
          </ListRows>
        ) : (
          <p className="text-sm text-muted-foreground">{talks.error ?? "Talks are not available right now."}</p>
        )}
      </CardContent>
    </Card>
  );
}
