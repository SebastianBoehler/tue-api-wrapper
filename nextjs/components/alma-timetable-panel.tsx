import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ExternalLink, Printer, RefreshCcw } from "lucide-react";

import type { AlmaTimetableView } from "../lib/discovery-types";
import { buildPortalApiUrl } from "../lib/portal-api";
import { AlmaTimetableFeedActions } from "./alma-timetable-feed-actions";


function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

export function AlmaTimetablePanel({
  view,
  filters
}: {
  view: AlmaTimetableView;
  filters: {
    term: string;
    week: string;
    fromDate: string;
    toDate: string;
    singleDay: string;
  };
}) {
  const pdfParams = new URLSearchParams();
  if (view.selected_term_value) {
    pdfParams.set("term", view.selected_term_value);
  }
  if (filters.week) {
    pdfParams.set("week", filters.week);
  }
  if (filters.singleDay) {
    pdfParams.set("single_day", filters.singleDay);
  }
  const canRenderPdf = view.can_print_pdf && !filters.fromDate && !filters.toDate;
  const pdfUrl = buildPortalApiUrl(`/api/alma/timetable/pdf?${pdfParams.toString()}`);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <div>
            <CardDescription>Alma timetable controls</CardDescription>
            <CardTitle>Filter schedule by term, week, or date</CardTitle>
          </div>
          <CardAction className="flex gap-2">
            {canRenderPdf ? (
              <Button variant="outline" size="xs" asChild>
                <a href={pdfUrl}>
                  <Printer className="size-3.5" />
                  PDF
                </a>
              </Button>
            ) : view.can_print_pdf ? (
              <Badge variant="outline"><Printer className="size-3" /> PDF</Badge>
            ) : null}
            {view.can_refresh_export_url ? <Badge variant="secondary"><RefreshCcw className="size-3" /> Feed refresh</Badge> : null}
            <Button variant="outline" size="xs" asChild>
              <a href={view.page_url}>
                <ExternalLink className="size-3.5" />
                Alma
              </a>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" action="/agenda" className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 md:grid-cols-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="agenda_term" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Term</label>
              <select id="agenda_term" name="term" defaultValue={filters.term || view.selected_term_value || ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                {view.terms.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="agenda_week" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Week</label>
              <select id="agenda_week" name="week" defaultValue={filters.week || view.selected_week_value || ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Current view</option>
                {view.weeks.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="agenda_day" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Single day</label>
              <input id="agenda_day" name="single_day" type="date" defaultValue={filters.singleDay} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="agenda_from" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From</label>
              <input id="agenda_from" name="from_date" type="date" defaultValue={filters.fromDate} className="h-9 rounded-md border border-input bg-background px-3 text-sm" disabled={!view.supports_custom_range} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="agenda_to" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">To</label>
              <div className="flex gap-2">
                <input id="agenda_to" name="to_date" type="date" defaultValue={filters.toDate} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm" disabled={!view.supports_custom_range} />
                <Button type="submit">Apply</Button>
                <Button variant="outline" asChild>
                  <a href="/agenda">Reset</a>
                </Button>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {view.selected_term_label ? <Badge variant="secondary">{view.selected_term_label}</Badge> : null}
            {view.selected_week_label ? <Badge variant="outline">{view.selected_week_label}</Badge> : null}
            {view.visible_range_start ? <span>{formatDate(view.visible_range_start)} to {formatDate(view.visible_range_end ?? view.visible_range_start)}</span> : null}
            <span>· {view.occurrences.length} items</span>
          </div>

          {view.calendar_feed_url ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Calendar feed</p>
                  <p className="text-xs text-muted-foreground mt-1">Use the live Alma ICS URL directly in your calendar client and renew it here when Alma rotates the token.</p>
                </div>
                <div className="w-full md:w-auto md:min-w-[24rem]">
                  <AlmaTimetableFeedActions
                    initialUrl={view.calendar_feed_url}
                    termValue={view.selected_term_value ?? ""}
                    canRefresh={view.can_refresh_export_url}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            Schedule view
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {view.days.length ? (
            <div className="flex flex-wrap gap-2">
              {view.days.map((day) => (
                <Badge key={`${day.iso_date ?? day.label}-${day.label}`} variant="outline">
                  {day.iso_date ? formatDate(day.iso_date) : day.label}
                  {day.note ? ` · ${day.note}` : ""}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {view.occurrences.map((item) => (
              <Card key={`${item.summary}-${item.start}`} size="sm">
                <CardContent className="grid grid-cols-[180px_minmax(0,1fr)_auto] items-center gap-4">
                  <time className="font-mono text-xs text-muted-foreground">
                    {formatDateTime(item.start)}
                  </time>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.summary}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description ?? "No description provided."}</p>
                  </div>
                  <Badge variant="outline">{item.location ?? "TBD"}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {!view.occurrences.length ? (
            <p className="text-sm text-muted-foreground">No Alma timetable items matched the selected filters.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
