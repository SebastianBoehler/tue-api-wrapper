import { CheckCircle2, CircleHelp, ExternalLink, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CoursePortalStatus } from "../lib/course-detail-types";

export function CoursePortalStatuses({ statuses }: { statuses: CoursePortalStatus[] }) {
  if (!statuses.length) {
    return null;
  }

  return (
    <section className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Signup status</p>
          <h2 className="text-sm font-semibold">Alma, ILIAS, and Moodle</h2>
        </div>
        <Badge variant="secondary">{signedCount(statuses)} signed up</Badge>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {statuses.map((status) => (
          <PortalStatusItem key={status.portal} status={status} />
        ))}
      </div>
    </section>
  );
}

function PortalStatusItem({ status }: { status: CoursePortalStatus }) {
  const Icon = statusIcon(status);
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{portalLabel(status.portal)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
            <Icon className="size-3.5 shrink-0" />
            {statusLabel(status)}
          </p>
        </div>
        {status.url ? (
          <Button variant="ghost" size="sm" asChild>
            <a href={status.url} aria-label={`Open ${portalLabel(status.portal)} match`}>
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        ) : null}
      </div>

      {status.title ? <p className="mt-2 line-clamp-2 text-sm">{status.title}</p> : null}
      <p className="mt-2 text-xs text-muted-foreground">
        {status.error ?? status.message ?? status.match_reason ?? "No portal evidence is available."}
      </p>
      {status.match_reason && !status.error ? (
        <p className="mt-1 text-[0.7rem] text-muted-foreground">
          {status.match_reason}
          {status.score !== null ? `, score ${status.score}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function signedCount(statuses: CoursePortalStatus[]): number {
  return statuses.filter((status) => status.signed_up === true).length;
}

function portalLabel(portal: string): string {
  if (portal === "alma") return "Alma";
  if (portal === "ilias") return "ILIAS";
  if (portal === "moodle") return "Moodle";
  return portal;
}

function statusLabel(status: CoursePortalStatus): string {
  if (status.signed_up === true) return "Signed up";
  if (status.signed_up === false) return "Not signed up";
  if (status.status === "error") return "Unavailable";
  return "Unknown";
}

function statusIcon(status: CoursePortalStatus) {
  if (status.signed_up === true) return CheckCircle2;
  if (status.signed_up === false) return XCircle;
  return CircleHelp;
}
