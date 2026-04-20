import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UniversityCalendarEvent, UniversityCalendarResponse } from "../lib/product-types";

function formatEventDate(value: string) {
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

function EventRow({ event }: { event: UniversityCalendarEvent }) {
  return (
    <article className="rounded-lg border border-border px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{formatEventDate(event.starts_at)}</Badge>
        {event.categories.slice(0, 2).map((category) => (
          <Badge key={category} variant="outline">{category}</Badge>
        ))}
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug">{event.title}</h3>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        {event.speaker ? <p>{event.speaker}</p> : null}
        {event.location ? <p>{event.location}</p> : null}
        {event.description ? <p>{event.description}</p> : null}
      </div>
      {event.url ? (
        <Button variant="link" className="mt-2 h-auto p-0" asChild>
          <a href={event.url} target="_blank" rel="noreferrer">
            Open event
          </a>
        </Button>
      ) : null}
    </article>
  );
}

export function UniversityEventsList({ events }: { events: UniversityCalendarResponse }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardDescription>uni-tuebingen.de RSS</CardDescription>
          <CardTitle>University events</CardTitle>
        </div>
        <CardAction className="flex gap-2">
          <Button variant="outline" size="xs" asChild>
            <a href={events.feed_url} target="_blank" rel="noreferrer">
              RSS
            </a>
          </Button>
          <Button variant="outline" size="xs" asChild>
            <a href={events.source_url} target="_blank" rel="noreferrer">
              Calendar
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.items.length ? (
          events.items.map((event) => <EventRow key={event.id} event={event} />)
        ) : (
          <div className="rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">
            No university events matched the current search.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
