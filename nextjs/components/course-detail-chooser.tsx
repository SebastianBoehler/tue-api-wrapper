import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AlmaCourseSearchResult } from "../lib/discovery-types";

export function CourseDetailChooser({
  title,
  candidates,
  coursesHref,
  almaHref
}: {
  title: string;
  candidates: AlmaCourseSearchResult[];
  coursesHref: string;
  almaHref: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardDescription>Alma search results</CardDescription>
          <CardTitle className="text-lg">Choose the matching course for “{title}”</CardTitle>
        </div>
        <CardAction className="flex gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={coursesHref as Route}>
              <ArrowLeft className="size-3.5" />
              Courses
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={almaHref}>
              <ExternalLink className="size-3.5" />
              Alma
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        {candidates.map((result) => (
          <Link
            key={`${result.detail_url ?? result.title}-${result.number ?? ""}`}
            href={`/courses/detail?url=${encodeURIComponent(result.detail_url ?? "")}` as Route}
            className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {result.number ? (
                  <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{result.number}</p>
                ) : null}
                <p className="text-sm font-medium">{result.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[result.event_type, result.responsible_lecturer || result.lecturer, result.organization]
                    .filter(Boolean)
                    .join(" · ") || "Alma course"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">Details →</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
