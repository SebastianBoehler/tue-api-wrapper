import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboard, PortalApiError } from "../../lib/portal-api";
import { MapPin } from "lucide-react";

export default async function AgendaPage() {
  try {
    const dashboard = await getDashboard();

    return (
      <AppShell title="Agenda">
        <div className="flex flex-col gap-2">
          {dashboard.agenda.items.map((item) => (
            <Card key={`${item.summary}-${item.start}`} size="sm">
              <CardContent className="grid grid-cols-[180px_minmax(0,1fr)_auto] items-center gap-4">
                <time className="font-mono text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("de-DE", {
                    weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit"
                  }).format(new Date(item.start))}
                </time>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.summary}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description ?? "No description provided."}</p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <MapPin className="size-3" />
                  {item.location ?? "TBD"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "The agenda could not load.";
    return (
      <AppShell title="Agenda">
        <ErrorPanel title="Agenda unavailable" message={message} />
      </AppShell>
    );
  }
}
