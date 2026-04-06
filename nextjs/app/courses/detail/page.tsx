import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AppShell } from "../../../components/app-shell";
import { ErrorPanel } from "../../../components/error-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dedupeCourseSearchResults,
  normalizeCourseTitle
} from "../../../lib/alma-course-detail";
import { getAlmaCourseSearch, getModuleDetail, PortalApiError } from "../../../lib/portal-api";

type SearchParamValue = string | string[] | undefined;

function readFirstSearchParam(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

function buildCourseSearchHref(title: string, term: string) {
  const params = new URLSearchParams();
  params.set("course_query", title);
  if (term) {
    params.set("course_term", term);
  }
  return `/courses?${params.toString()}`;
}

export default async function CourseDetailPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, SearchParamValue>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const detailUrl = readFirstSearchParam(resolvedSearchParams.url);
  const title = readFirstSearchParam(resolvedSearchParams.title);
  const term = readFirstSearchParam(resolvedSearchParams.term);

  if (!detailUrl && !title) {
    return (
      <AppShell title="Course Detail">
        <ErrorPanel title="Missing course reference" message="No Alma detail URL or event title was provided." />
      </AppShell>
    );
  }

  try {
    let resolvedDetailUrl = detailUrl;

    if (!resolvedDetailUrl) {
      const searchResponse = await getAlmaCourseSearch({
        query: title,
        term,
        limit: 12
      });
      const candidates = dedupeCourseSearchResults(searchResponse.results).filter(
        (result) => result.detail_url
      );
      const exactMatches = candidates.filter(
        (result) => normalizeCourseTitle(result.title) === normalizeCourseTitle(title)
      );

      if (exactMatches.length === 1) {
        resolvedDetailUrl = exactMatches[0].detail_url ?? "";
      } else if (exactMatches.length === 0 && candidates.length === 1) {
        resolvedDetailUrl = candidates[0].detail_url ?? "";
      } else if (candidates.length > 0) {
        return (
          <AppShell title="Course Detail">
            <Card>
              <CardHeader>
                <div>
                  <CardDescription>Alma search results</CardDescription>
                  <CardTitle className="text-lg">Choose the matching course for “{title}”</CardTitle>
                </div>
                <CardAction className="flex gap-2">
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={buildCourseSearchHref(title, term) as Route}>
                      <ArrowLeft className="size-3.5" />
                      Courses
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={searchResponse.page_url}>
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
          </AppShell>
        );
      } else {
        return (
          <AppShell title="Course Detail">
            <ErrorPanel
              title="Course detail unavailable"
              message={`No Alma course detail page matched “${title}”. Try the course search for a broader lookup.`}
            />
          </AppShell>
        );
      }
    }

    const detail = await getModuleDetail(resolvedDetailUrl);

    return (
      <AppShell title="Course Detail">
        <Card>
          <CardHeader>
            <div>
              <CardDescription>{detail.number}</CardDescription>
              <CardTitle className="text-lg">{detail.title}</CardTitle>
            </div>
            <CardAction className="flex gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link href={(title ? buildCourseSearchHref(title, term) : "/courses") as Route}>
                  <ArrowLeft className="size-3.5" />
                  Back
                </Link>
              </Button>
              {detail.permalink ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={detail.permalink}>
                    <ExternalLink className="size-3.5" />
                    Source
                  </a>
                </Button>
              ) : null}
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {detail.available_tabs.map((tab) => (
                <Badge key={tab} variant={tab === detail.active_tab ? "default" : "outline"}>
                  {tab}
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {detail.sections.map((section) => (
                <div key={section.title} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{section.title}</p>
                  <div className="flex flex-col gap-2">
                    {section.fields.map((field) => (
                      <div key={`${section.title}-${field.label}`}>
                        <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">{field.label}</span>
                        <p className="text-sm font-medium leading-snug">{field.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  } catch (error: unknown) {
    const message = error instanceof PortalApiError ? error.message : "Course detail could not load.";
    return (
      <AppShell title="Course Detail">
        <ErrorPanel title="Unavailable" message={message} />
      </AppShell>
    );
  }
}
