import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getIliasTasks, PortalApiError } from "../../lib/portal-api";
import { ArrowRight, ClipboardList } from "lucide-react";

function buildSpaceHref(target: string) {
  return `/spaces?target=${encodeURIComponent(target)}`;
}

export default async function TasksPage() {
  try {
    const tasks = await getIliasTasks(24);

    return (
      <AppShell title="Tasks">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Active ILIAS tasks</CardTitle>
              <CardDescription>Due items extracted from the authenticated To-Do view.</CardDescription>
            </div>
            <CardAction>
              <Badge variant="secondary">{tasks.length} active</Badge>
            </CardAction>
          </CardHeader>
        </Card>

        <div className="grid gap-3">
          {tasks.map((task) => (
            <Card key={`${task.title}-${task.url}`} size="sm">
              <CardContent className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="size-4 text-primary" />
                    <p className="text-sm font-medium">{task.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {task.item_type ? <Badge variant="outline">{task.item_type}</Badge> : null}
                    {task.start ? <Badge variant="secondary">Start {task.start}</Badge> : null}
                    {task.end ? <Badge variant="secondary">Due {task.end}</Badge> : null}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={buildSpaceHref(task.url)}>
                    Open
                    <ArrowRight className="size-3.5" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
          {!tasks.length ? (
            <Card>
              <CardContent className="text-sm text-muted-foreground">
                No active tasks were visible in ILIAS.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "Tasks could not load.";
    return <AppShell title="Tasks"><ErrorPanel title="Tasks unavailable" message={message} /></AppShell>;
  }
}
