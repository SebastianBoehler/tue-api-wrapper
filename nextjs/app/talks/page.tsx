import type { Route } from "next";
import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PortalApiError } from "../../lib/portal-api";
import { getTalk, getTalks } from "../../lib/product-api";
import type { Talk } from "../../lib/product-types";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time pending";
  }
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function buildTalksHref(options: {
  query?: string;
  tagId?: number | null;
  scope?: string;
  talkId?: number | null;
}) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set("query", options.query.trim());
  if (options.tagId) params.set("tagId", String(options.tagId));
  if (options.scope && options.scope !== "upcoming") params.set("scope", options.scope);
  if (options.talkId) params.set("talkId", String(options.talkId));
  const query = params.toString();
  return query ? `/talks?${query}` : "/talks";
}

export default async function TalksPage({
  searchParams
}: {
  searchParams?: Promise<{ query?: string; tagId?: string; scope?: string; talkId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.query?.trim() ?? "";
  const scope = params.scope === "previous" ? "previous" : "upcoming";
  const tagId = Number(params.tagId);
  const selectedTagId = Number.isFinite(tagId) && tagId > 0 ? tagId : null;
  const talkId = Number(params.talkId);
  const selectedTalkId = Number.isFinite(talkId) && talkId > 0 ? talkId : null;

  try {
    const talks = await getTalks({
      scope,
      query,
      tagIds: selectedTagId ? [selectedTagId] : [],
      limit: 50
    });
    const selectedTalk = selectedTalkId
      ? talks.items.find((talk) => talk.id === selectedTalkId) ?? await getTalk(selectedTalkId)
      : talks.items[0] ?? null;

    return (
      <AppShell title="Talks">
        <Card className="border-primary/15 bg-primary/5">
          <CardHeader>
            <div>
              <CardDescription>talks.tuebingen.ai</CardDescription>
              <CardTitle className="text-2xl">Talks</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Upcoming research talks, colloquia, group meetings, and social events from the Tübingen AI talks calendar.
              </p>
            </div>
            <CardAction>
              <Button variant="outline" size="xs" asChild>
                <a href={talks.source_url} target="_blank" rel="noreferrer">
                  Open talks calendar
                </a>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <form action="/talks" method="get" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-end">
              <div className="min-w-0">
                <label htmlFor="talks-query" className="text-xs uppercase text-muted-foreground">
                  Search
                </label>
                <Input id="talks-query" name="query" defaultValue={query} placeholder="Speaker, title, topic, location" />
              </div>
              <div>
                <label htmlFor="talks-tag" className="text-xs uppercase text-muted-foreground">
                  Tag
                </label>
                <select
                  id="talks-tag"
                  name="tagId"
                  defaultValue={selectedTagId ? String(selectedTagId) : ""}
                  className="h-9 w-full rounded-md border border-input bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  <option value="">Any</option>
                  {talks.available_tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="talks-scope" className="text-xs uppercase text-muted-foreground">
                  Range
                </label>
                <select
                  id="talks-scope"
                  name="scope"
                  defaultValue={scope}
                  className="h-9 w-full rounded-md border border-input bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="previous">Previous</option>
                </select>
              </div>
              <Button type="submit">Apply</Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <Card>
            <CardHeader>
              <CardTitle>{scope === "previous" ? "Previous talks" : "Upcoming talks"}</CardTitle>
              <CardDescription>{talks.total_hits} live matches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {talks.items.length ? (
                talks.items.map((talk) => (
                  <TalkRow
                    key={talk.id}
                    talk={talk}
                    href={buildTalksHref({ query, tagId: selectedTagId, scope, talkId: talk.id })}
                    active={selectedTalk?.id === talk.id}
                  />
                ))
              ) : (
                <div className="rounded-md bg-muted px-4 py-5 text-sm text-muted-foreground">
                  No talks matched the current filters.
                </div>
              )}
            </CardContent>
          </Card>

          <TalkDetail talk={selectedTalk} />
        </div>
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "The talks calendar could not load live data.";
    return (
      <AppShell title="Talks">
        <ErrorPanel title="Talks unavailable" message={message} />
      </AppShell>
    );
  }
}

function TalkRow({ talk, href, active }: { talk: Talk; href: string; active: boolean }) {
  return (
    <Link
      href={href as Route}
      className={`block rounded-md border p-4 transition-colors hover:bg-muted/40 ${active ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <div className="flex flex-wrap gap-2">
        {talk.tags.map((tag) => (
          <Badge key={`${talk.id}-${tag.id}`} variant="secondary">{tag.name}</Badge>
        ))}
        {talk.disabled ? <Badge variant="outline">Hidden</Badge> : null}
      </div>
      <p className="mt-3 text-sm font-medium">{talk.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{talk.speaker_name ?? "Speaker pending"}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <time>{formatDate(talk.timestamp)}</time>
        {talk.location ? <span>{talk.location}</span> : null}
      </div>
    </Link>
  );
}

function TalkDetail({ talk }: { talk: Talk | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{talk ? talk.title : "Select a talk"}</CardTitle>
        <CardDescription>{talk?.speaker_name ?? "Choose a talk to inspect its speaker, abstract, and location."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {talk ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{formatDate(talk.timestamp)}</Badge>
              {talk.location ? <Badge variant="outline">{talk.location}</Badge> : null}
            </div>
            {talk.speaker_bio ? (
              <div>
                <p className="text-xs uppercase text-muted-foreground">Speaker</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{talk.speaker_bio}</p>
              </div>
            ) : null}
            {talk.description ? (
              <div>
                <p className="text-xs uppercase text-muted-foreground">Abstract</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{talk.description}</p>
              </div>
            ) : null}
            <Button variant="outline" asChild>
              <a href={talk.source_url} target="_blank" rel="noreferrer">
                Open original talk
              </a>
            </Button>
          </>
        ) : (
          <div className="rounded-md bg-muted px-4 py-5 text-sm text-muted-foreground">
            Speaker notes, abstract, tags, and the original talks.tuebingen.ai link appear here after selecting a talk.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
