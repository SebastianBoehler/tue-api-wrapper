import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { DashboardMailCard } from "../components/dashboard-mail-card";
import { DashboardTalksCard } from "../components/dashboard-talks-card";
import { DashboardNotificationsFeedCard } from "../components/dashboard-notifications-feed-card";
import { ErrorPanel } from "../components/error-panel";
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListRow, ListRows } from "../components/list-row";
import { buildAgendaCourseDetailHref } from "../lib/alma-course-detail";
import { buildPortalApiUrl, getDashboard, PortalApiError } from "../lib/portal-api";
import { spaceKindColor } from "../lib/space-kind";
import { cn } from "../lib/utils";
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

function formatCredits(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
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
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{dashboard.hero.subtitle}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {dashboard.metrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-primary/15 bg-background/60 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{metric.label}</p>
                  <p className="text-3xl font-semibold tracking-tight mt-1 text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/60 text-xs text-muted-foreground">
            Updated {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dashboard.generatedAt))}
          </CardFooter>
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
              <CardContent>
                <ListRows>
                  {dashboard.agenda.items.slice(0, 6).map((item) => (
                    <ListRow key={`${item.summary}-${item.start}`} href={buildAgendaCourseDetailHref(item, undefined)}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.summary}</p>
                          <p className="text-xs text-muted-foreground">{item.location ?? "Location pending"}</p>
                        </div>
                        <time className="text-xs text-muted-foreground shrink-0">{formatDate(item.start)}</time>
                      </div>
                    </ListRow>
                  ))}
                </ListRows>
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
              <CardContent>
                <ListRows>
                  {dashboard.ilias.memberships.slice(0, 6).map((space) => (
                    <ListRow key={`${space.title}-${space.url}`} href={buildSpaceHref(space.url)}>
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-1 h-4 w-1 shrink-0 rounded-full", spaceKindColor(space.kind))} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{space.title}</p>
                            {space.kind ? <Badge variant="secondary">{space.kind}</Badge> : null}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {space.description ?? space.properties[0] ?? "Open learning space"}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 self-center">Open →</span>
                      </div>
                    </ListRow>
                  ))}
                </ListRows>
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
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected term</p>
                    <p className="text-sm font-medium mt-1">{dashboard.study.selectedTerm ?? "Unknown"}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Saved semester</p>
                    <p className="text-sm font-medium mt-1">
                      {dashboard.study.currentSemesterCredits === null
                        ? "Unavailable"
                        : `${formatCredits(dashboard.study.currentSemesterCredits)} CP`}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracked credits</p>
                    <p className="text-sm font-medium mt-1">{dashboard.study.trackedCredits}</p>
                  </div>
                </div>
                {dashboard.study.currentSemesterCreditError ? (
                  <p className="text-xs text-muted-foreground">{dashboard.study.currentSemesterCreditError}</p>
                ) : dashboard.study.currentSemesterCreditUnresolved.length ? (
                  <p className="text-xs text-muted-foreground">
                    CP missing for {dashboard.study.currentSemesterCreditUnresolved.length} saved courses.
                  </p>
                ) : null}
                <ListRows>
                  {dashboard.exams.slice(0, 4).map((exam) => (
                    <ListRow key={`${exam.number}-${exam.title}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{exam.title}</p>
                          <p className="text-xs text-muted-foreground">{exam.number ?? "No number"}{exam.cp ? ` · ${exam.cp} CP` : ""}</p>
                        </div>
                        <div className="flex gap-1.5">
                          {exam.status ? <Badge variant="secondary">{exam.status}</Badge> : null}
                          {exam.grade ? <Badge variant="outline">{exam.grade}</Badge> : null}
                        </div>
                      </div>
                    </ListRow>
                  ))}
                </ListRows>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Download className="size-4 text-primary" />Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <ListRows>
                  {dashboard.quickLinks.map((link) => (
                    <ListRow key={link.href} href={link.href}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{link.label}</p>
                          <p className="text-xs text-muted-foreground">{link.description}</p>
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                      </div>
                    </ListRow>
                  ))}
                </ListRows>
                {dashboard.documents.currentDownloadUrl ? (
                  <Button variant="secondary" asChild>
                    <a href={buildPortalApiUrl(dashboard.documents.currentDownloadUrl)}>Download current Alma PDF</a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <DashboardTalksCard talks={dashboard.talks} />
            <DashboardNotificationsFeedCard />
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
