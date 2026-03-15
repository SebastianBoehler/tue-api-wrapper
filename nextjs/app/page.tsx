import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { DashboardMailCard } from "../components/dashboard-mail-card";
import { ErrorPanel } from "../components/error-panel";
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildPortalApiUrl, getDashboard, PortalApiError } from "../lib/portal-api";
import { Calendar, ArrowRight, Download, GraduationCap, FolderOpen, ClipboardList } from "lucide-react";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function buildSpaceHref(target: string) {
  return `/spaces?target=${encodeURIComponent(target)}`;
}

export default async function HomePage() {
  try {
    const dashboard = await getDashboard();

    return (
      <AppShell title="Overview">
        <Card className="border-primary/15 bg-primary/5">
          <CardHeader>
            <div>
              <CardDescription>{dashboard.termLabel}</CardDescription>
              <CardTitle className="text-2xl">{dashboard.hero.title}</CardTitle>
            </div>
            <CardAction>
              <Badge variant="secondary">{new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dashboard.generatedAt))}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground max-w-3xl">{dashboard.hero.subtitle}</p>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {dashboard.metrics.map((metric) => (
                <Card key={metric.label} size="sm">
                  <CardContent>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{metric.label}</p>
                    <p className="text-2xl font-semibold tracking-tight mt-1">{metric.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-3">
          <div className="flex flex-col gap-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="size-4 text-primary" />Upcoming</CardTitle>
                <CardAction>
                  <Button variant="outline" size="xs" asChild>
                    <Link href="/agenda">Agenda</Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                {dashboard.agenda.items.slice(0, 6).map((item) => (
                  <div key={`${item.summary}-${item.start}`} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.summary}</p>
                      <p className="text-xs text-muted-foreground">{item.location ?? "Location pending"}</p>
                    </div>
                    <time className="text-xs text-muted-foreground shrink-0">{formatDate(item.start)}</time>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FolderOpen className="size-4 text-primary" />Learning spaces</CardTitle>
                <CardAction>
                  <Button variant="outline" size="xs" asChild>
                    <Link href="/spaces">All spaces</Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                {dashboard.ilias.memberships.slice(0, 6).map((space) => (
                  <a key={`${space.title}-${space.url}`} href={buildSpaceHref(space.url)} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/50 -mx-1 px-1 rounded-sm transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{space.title}</p>
                        {space.kind ? <Badge variant="secondary">{space.kind}</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {space.description ?? space.properties[0] ?? "Open learning space"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">Open →</span>
                  </a>
                ))}
              </CardContent>
            </Card>
            <DashboardMailCard mail={dashboard.mail} />
          </div>

          <div className="flex flex-col gap-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardList className="size-4 text-primary" />Tasks</CardTitle>
                <CardAction>
                  <Button variant="outline" size="xs" asChild>
                    <Link href="/tasks">All tasks</Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {dashboard.ilias.tasks.slice(0, 4).map((task) => (
                  <a key={`${task.title}-${task.url}`} href={buildSpaceHref(task.url)} className="border border-border rounded-lg p-3 hover:bg-muted/40 transition-colors">
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {task.item_type ? <Badge variant="outline">{task.item_type}</Badge> : null}
                      {task.start ? <Badge variant="secondary">Start {task.start}</Badge> : null}
                      {task.end ? <Badge variant="secondary">Due {task.end}</Badge> : null}
                    </div>
                  </a>
                ))}
                {!dashboard.ilias.tasks.length ? (
                  <p className="text-sm text-muted-foreground">No active tasks were exposed in ILIAS.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GraduationCap className="size-4 text-primary" />Study progress</CardTitle>
                <CardAction>
                  <Button variant="outline" size="xs" asChild>
                    <Link href="/progress">Open progress</Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected term</p>
                    <p className="text-sm font-medium mt-1">{dashboard.study.selectedTerm ?? "Unknown"}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracked credits</p>
                    <p className="text-sm font-medium mt-1">{dashboard.study.trackedCredits}</p>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {dashboard.exams.slice(0, 4).map((exam) => (
                    <div key={`${exam.number}-${exam.title}`} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{exam.title}</p>
                        <p className="text-xs text-muted-foreground">{exam.number ?? "No number"}{exam.cp ? ` · ${exam.cp} CP` : ""}</p>
                      </div>
                      <div className="flex gap-1.5">
                        {exam.status ? <Badge variant="secondary">{exam.status}</Badge> : null}
                        {exam.grade ? <Badge variant="outline">{exam.grade}</Badge> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Download className="size-4 text-primary" />Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {dashboard.quickLinks.map((link) => (
                  <a key={link.href} href={link.href} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                  </a>
                ))}
                {dashboard.documents.currentDownloadUrl ? (
                  <Button variant="secondary" asChild>
                    <a href={buildPortalApiUrl(dashboard.documents.currentDownloadUrl)}>Download current Alma PDF</a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "The dashboard could not load live portal data.";
    return (
      <AppShell title="Overview">
        <ErrorPanel title="Backend unavailable" message={message} />
      </AppShell>
    );
  }
}
