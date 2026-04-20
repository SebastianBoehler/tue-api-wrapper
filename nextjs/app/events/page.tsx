import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { UniversityEventsList } from "../../components/university-events-list";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PortalApiError } from "../../lib/portal-api";
import { getUniversityEvents } from "../../lib/product-api";

export default async function EventsPage({
  searchParams
}: {
  searchParams?: Promise<{ query?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.query?.trim() ?? "";

  try {
    const events = await getUniversityEvents({ query, limit: 60 });

    return (
      <AppShell title="University Events">
        <Card className="border-primary/15 bg-primary/5">
          <CardHeader>
            <div>
              <CardDescription>uni-tuebingen.de</CardDescription>
              <CardTitle className="text-2xl">University events</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Public lectures, Studium Generale, faculty events, workshops, and anniversary dates from the official calendar.
              </p>
            </div>
            <CardAction>
              <Button variant="outline" size="xs" asChild>
                <a href={events.source_url} target="_blank" rel="noreferrer">
                  Open calendar
                </a>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <form action="/events" method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="min-w-0">
                <label htmlFor="events-query" className="text-xs uppercase text-muted-foreground">
                  Search
                </label>
                <Input id="events-query" name="query" defaultValue={query} placeholder="Topic, speaker, category, location" />
              </div>
              <Button type="submit">Apply</Button>
            </form>
          </CardContent>
        </Card>

        <UniversityEventsList events={events} />
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "University events could not load live data.";
    return (
      <AppShell title="University Events">
        <ErrorPanel title="Events unavailable" message={message} />
      </AppShell>
    );
  }
}
