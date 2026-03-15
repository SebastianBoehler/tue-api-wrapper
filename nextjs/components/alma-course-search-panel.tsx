import type { AlmaCourseSearchResponse } from "../lib/discovery-types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink } from "lucide-react";

export function AlmaCourseSearchPanel({
  response,
  query,
  term
}: {
  response: AlmaCourseSearchResponse;
  query: string;
  term: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardDescription>Alma event search</CardDescription>
          <CardTitle>Search courses and events</CardTitle>
        </div>
        <CardAction>
          <Button variant="outline" size="xs" asChild>
            <a href={response.page_url}>
              <ExternalLink className="size-3.5" />
              Alma
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form method="get" action="/courses" className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="course_query" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Query</label>
            <Input id="course_query" name="course_query" defaultValue={query} placeholder="Titel, Nummer, Dozent/-in" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="course_term" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Semester</label>
            <select id="course_term" name="course_term" defaultValue={term} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Current selection</option>
              {response.term_options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" className="w-full md:w-auto">
              <Search className="size-4" />
              Search
            </Button>
          </div>
        </form>

        {query ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Results for</span>
            <Badge variant="secondary">{query}</Badge>
            {response.selected_term_label ? <span>in {response.selected_term_label}</span> : null}
            <span>· {response.results.length} shown</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This search is backed by Alma&apos;s student event search and uses the authenticated semester context.
          </p>
        )}

        {response.results.length ? (
          <div className="grid gap-2">
            {response.results.map((result) => (
              <div key={`${result.number ?? "event"}-${result.title}`} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {result.number ? <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{result.number}</p> : null}
                    <p className="text-sm font-medium">{result.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {[result.event_type, result.responsible_lecturer || result.lecturer, result.organization].filter(Boolean).join(" · ") || "Alma event"}
                    </p>
                  </div>
                  {result.detail_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={result.detail_url}>Open in Alma</a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : query ? (
          <p className="text-sm text-muted-foreground">No Alma events matched the current query and semester.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
