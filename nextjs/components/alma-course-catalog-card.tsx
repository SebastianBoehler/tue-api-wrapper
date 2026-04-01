import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

import type { AlmaCourseCatalogPage } from "../lib/discovery-types";


export function AlmaCourseCatalogCard({
  catalog,
  selectedTerm,
  courseQuery,
  courseTerm
}: {
  catalog: AlmaCourseCatalogPage;
  selectedTerm: string;
  courseQuery: string;
  courseTerm: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardDescription>Alma course catalog</CardDescription>
          <CardTitle>Browse the lecture catalog by term</CardTitle>
        </div>
        <CardAction>
          <Button variant="outline" size="xs" asChild>
            <a href={catalog.page_url}>
              <ExternalLink className="size-3.5" />
              Alma
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {catalog.term_options.length ? (
          <form method="get" action="/courses" className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 md:grid-cols-[220px_auto]">
            <input type="hidden" name="course_query" value={courseQuery} />
            <input type="hidden" name="course_term" value={courseTerm} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="catalog_term" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Catalog term</label>
              <select id="catalog_term" name="catalog_term" defaultValue={selectedTerm} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                {catalog.term_options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit">Load term</Button>
            </div>
          </form>
        ) : null}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {catalog.selected_term_label ? <Badge variant="secondary">{catalog.selected_term_label}</Badge> : null}
          <span>{catalog.nodes.length} catalog nodes shown</span>
        </div>

        <div className="grid gap-2">
          {catalog.nodes.map((node, index) => (
            <div
              key={`${node.title}-${index}`}
              className="rounded-xl border border-border bg-card p-4"
              style={{ marginLeft: `${Math.max(0, node.level - 1) * 16}px` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {node.kind ? <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{node.kind}</p> : null}
                  <p className="text-sm font-medium">{node.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {node.description ?? (node.expandable ? "Expandable catalog branch" : "Catalog entry")}
                  </p>
                </div>
                {node.permalink ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={node.permalink}>Open</a>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
