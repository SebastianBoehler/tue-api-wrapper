import type { IliasSearchFilters, IliasSearchResponse } from "../lib/discovery-types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

function buildSpaceHref(target: string) {
  return `/spaces?target=${encodeURIComponent(target)}`;
}

export function IliasSearchPanel({
  filters,
  result,
  term,
  searchMode,
  contentTypes
}: {
  filters: IliasSearchFilters;
  result: IliasSearchResponse | null;
  term: string;
  searchMode: string;
  contentTypes: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardDescription>ILIAS search</CardDescription>
          <CardTitle>Find course materials faster</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form method="get" action="/spaces" className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px_auto]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="query" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Query</label>
              <Input id="query" name="query" defaultValue={term} placeholder="graphics, worksheet, exam review…" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="search_mode" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search mode</label>
              <select id="search_mode" name="search_mode" defaultValue={searchMode} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Default</option>
                {filters.search_modes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full md:w-auto">
                <Search className="size-4" />
                Search
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.content_types.map((option) => (
              <label key={option.value} className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${contentTypes.includes(option.value) ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}>
                <input type="checkbox" name="content_type" value={option.value} defaultChecked={contentTypes.includes(option.value)} />
                {option.label}
              </label>
            ))}
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {filters.area_label ? <span>Area: {filters.area_label}</span> : null}
          {result ? <Badge variant="secondary">{result.results.length} results</Badge> : null}
        </div>

        {result?.results.length ? (
          <div className="grid gap-2">
            {result.results.map((item) => (
              <div key={`${item.url ?? "item"}-${item.title}`} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {[item.item_type, item.breadcrumbs.join(" / "), item.properties[0]].filter(Boolean).join(" · ")}
                    </p>
                    {item.description ? <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p> : null}
                  </div>
                  {item.url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={buildSpaceHref(item.url)}>Open</a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : term ? (
          <p className="text-sm text-muted-foreground">No ILIAS matches were found for the current search.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Filter by object type to search for files, forums, courses, and exercises without navigating ILIAS manually.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
