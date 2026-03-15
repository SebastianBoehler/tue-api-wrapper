import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { IliasSearchPanel } from "../../components/ilias-search-panel";
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseIliasSearchParams } from "../../lib/discovery-query";
import { getIliasContent, getIliasExercise, getIliasForum, getIliasMemberships, getIliasSearchOptions, PortalApiError, searchIlias } from "../../lib/portal-api";
import { ArrowLeft, ExternalLink, FileText, ClipboardList, MessageCircle } from "lucide-react";

function buildSpaceHref(target: string) {
  return `/spaces?target=${encodeURIComponent(target)}`;
}

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function SpacesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const target = firstValue(resolvedSearchParams.target).trim();
  const search = parseIliasSearchParams(resolvedSearchParams);

  if (!target) {
    try {
      const [memberships, searchOptions, searchResults] = await Promise.all([
        getIliasMemberships(40),
        getIliasSearchOptions(),
        search.term
          ? searchIlias({
            term: search.term,
            searchMode: search.searchMode,
            contentTypes: search.contentTypes,
            createdEnabled: search.createdEnabled,
            createdMode: search.createdMode,
            createdDate: search.createdDate
          })
          : Promise.resolve(null)
      ]);
      return (
        <AppShell title="Learning Spaces">
          <IliasSearchPanel
            filters={searchOptions}
            result={searchResults}
            term={search.term}
            searchMode={search.searchMode}
            contentTypes={search.contentTypes}
          />
          <Card>
            <CardHeader>
              <CardTitle>My learning spaces</CardTitle>
              <CardDescription>Authenticated memberships from ILIAS courses and groups.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {memberships.map((space) => (
                  <a key={`${space.title}-${space.url}`} href={buildSpaceHref(space.url)} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/50 -mx-1 px-1 rounded-sm transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{space.title}</span>
                        {space.kind ? <Badge variant="secondary">{space.kind}</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {space.description ?? space.properties[0] ?? "Open the learning space"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">Open →</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </AppShell>
      );
    } catch (error) {
      const msg = error instanceof PortalApiError ? error.message : "ILIAS could not load.";
      return <AppShell title="Learning Spaces"><ErrorPanel title="ILIAS unavailable" message={msg} /></AppShell>;
    }
  }

  try {
    const [contentResult, forumResult, exerciseResult] = await Promise.allSettled([getIliasContent(target), getIliasForum(target), getIliasExercise(target)]);
    const content = contentResult.status === "fulfilled" ? contentResult.value : null;
    const forum = forumResult.status === "fulfilled" ? forumResult.value : [];
    const exercise = exerciseResult.status === "fulfilled" ? exerciseResult.value : [];
    if (!content && !forum.length && !exercise.length) throw contentResult.status === "rejected" ? contentResult.reason : new Error("No data.");

    return (
      <AppShell title="Learning Spaces">
        <Card>
          <CardHeader>
            <div>
              <CardDescription>ILIAS proxy</CardDescription>
              <CardTitle>{content?.title ?? "Learning space"}</CardTitle>
            </div>
            <CardAction className="flex gap-2">
              <Button variant="secondary" size="sm" asChild><Link href="/spaces"><ArrowLeft className="size-3.5" />Spaces</Link></Button>
              <Button variant="outline" size="sm" asChild><a href={target}><ExternalLink className="size-3.5" />Original</a></Button>
            </CardAction>
          </CardHeader>
        </Card>

        {content?.sections.length ? (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-4 text-primary" />Contents</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {content.sections.map((section) => (
                <div key={section.label} className="border border-border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">{section.label}</p>
                  <div className="divide-y divide-border">
                    {section.items.map((item) => (
                      <a key={`${item.label}-${item.url}`} href={buildSpaceHref(item.url)} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0 hover:bg-background -mx-1 px-1 rounded-sm transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{[item.kind, ...item.properties].filter(Boolean).join(" · ") || "ILIAS object"}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">Open</Badge>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {exercise.length ? (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="size-4 text-primary" />Exercises</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {exercise.map((item) => (
                <div key={`${item.title}-${item.url}`} className="border border-border rounded-lg p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.due_at ?? item.due_hint ?? "No due date"}</p>
                  <div className="flex gap-1.5 mt-2">{[item.status, item.requirement, item.submission_type].filter(Boolean).map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {forum.length ? (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="size-4 text-primary" />Forum</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {forum.map((topic) => (
                <div key={`${topic.title}-${topic.url}`} className="border border-border rounded-lg p-3">
                  <p className="text-sm font-medium">{topic.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{[topic.author, topic.posts ? `${topic.posts} posts` : null, topic.visits ? `${topic.visits} visits` : null].filter(Boolean).join(" · ")}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </AppShell>
    );
  } catch (error) {
    const msg = error instanceof PortalApiError ? error.message : "ILIAS could not load.";
    return <AppShell title="Learning Spaces"><ErrorPanel title="ILIAS unavailable" message={msg} /></AppShell>;
  }
}
