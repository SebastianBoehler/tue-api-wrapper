import { useEffect, useMemo, useState, type CSSProperties } from "react";

import type { AlmaTimetableCourseAssignment, DashboardAgendaItem } from "../../lib/dashboard-types";
import { courseLookupQuery, extractCourseDetailUrl } from "../../lib/course-detail-url";
import { formatDateRange } from "../../lib/format";
import { EmptyState } from "./DashboardPrimitives";
import type { CourseNavigationProps, DashboardPageProps } from "./types";

export function CalendarPage({ data, onOpenCourseDetail }: DashboardPageProps & CourseNavigationProps) {
  const rawEvents = data?.agenda.items ?? [];
  const events = useMemo(() => dedupeEvents(rawEvents), [rawEvents]);
  const days = useMemo(() => groupEventsByDay(events), [events]);
  const timeline = useMemo(() => timelineBounds(events), [events]);
  const [selectedEvent, setSelectedEvent] = useState<DashboardAgendaItem | null>(null);
  const hiddenDuplicates = rawEvents.length - events.length;

  useEffect(() => {
    setSelectedEvent((current) => current && events.includes(current) ? current : null);
  }, [events]);

  return (
    <div className="schedule-layout">
      <section className="schedule-main">
        <article className="panel schedule-panel">
          <div className="section-heading schedule-heading">
            <h3>Timetable</h3>
            <div className="schedule-heading-meta">
              <span>{days.length} days · {events.length} events{hiddenDuplicates ? ` · ${hiddenDuplicates} duplicate hidden` : ""}</span>
              {data?.agenda.exportUrl ? (
                <button className="ghost-button compact-button" onClick={() => void window.desktop.openExternal(data.agenda.exportUrl ?? "")} type="button">
                  Open export
                </button>
              ) : null}
            </div>
          </div>
          {days.length > 0 ? (
            <div
              className="schedule-timeline"
              style={{ gridTemplateColumns: `54px repeat(${days.length}, minmax(168px, 1fr))` }}
            >
              <div className="schedule-time-gutter" style={{ height: timeline.height }}>
                {timeline.hours.map((hour) => (
                  <span key={hour} style={{ top: hourTop(hour, timeline) }}>{hourLabel(hour)}</span>
                ))}
              </div>
              {days.map((day) => (
                <section key={day.key} className="schedule-day-column">
                  <div className="schedule-day-header">
                    <strong>{day.weekday}</strong>
                    <span>{day.dateLabel}</span>
                  </div>
                  <div className="schedule-day-lane" style={{ height: timeline.height }}>
                    {day.items.map((item) => {
                      const color = courseColor(item.summary);
                      const placement = eventPlacement(item, timeline);
                      return (
                        <button
                          key={eventKey(item)}
                          className={selectedEvent === item ? "schedule-slot active" : "schedule-slot"}
                          onClick={() => {
                            setSelectedEvent(item);
                            onOpenCourseDetail(courseDetailTarget(item, data));
                          }}
                          style={
                            {
                              "--course-accent": color.accent,
                              "--course-bg": color.background,
                              "--course-focus": color.focus,
                              "--slot-height": `${placement.height}px`,
                              "--slot-top": `${placement.top}px`
                            } as CSSProperties
                          }
                          type="button"
                        >
                          <time>{formatTime(item.start, item.end)}</time>
                          <strong>{item.summary}</strong>
                          <span>{item.location || "Location pending"}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState>No timetable events returned for this term.</EmptyState>
          )}
        </article>
      </section>
    </div>
  );
}

const HOUR_HEIGHT = 58;
const MIN_SLOT_HEIGHT = 74;

function courseDetailTarget(item: DashboardAgendaItem, data: DashboardPageProps["data"]) {
  const assignment = findCourseAssignment(data?.study.currentSemesterCourses ?? [], item);
  return {
    title: assignment?.number ?? courseLookupQuery(item.summary),
    term: data?.termLabel,
    url: assignment?.detail_url ?? extractCourseDetailUrl(item),
    sourceLabel: "Calendar",
    event: item,
    assignment
  };
}

function groupEventsByDay(events: DashboardAgendaItem[]) {
  const formatter = new Intl.DateTimeFormat("de-DE", { weekday: "short" });
  const dateFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" });
  const groups = new Map<string, DashboardAgendaItem[]>();

  for (const event of events) {
    const date = new Date(event.start);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const key = date.toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return [...groups.entries()].slice(0, 7).map(([key, items]) => {
    const date = new Date(`${key}T00:00:00`);
    return {
      key,
      weekday: formatter.format(date),
      dateLabel: dateFormatter.format(date),
      items: items.sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
    };
  });
}

function dedupeEvents(events: DashboardAgendaItem[]): DashboardAgendaItem[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = eventKey(event);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function eventKey(event: DashboardAgendaItem): string {
  return [
    normalizeCourseSummary(event.summary),
    isoDateKey(event.start),
    event.end ? isoDateKey(event.end) : "",
    (event.location ?? "").replace(/\s+/g, " ").trim().toLocaleLowerCase("de-DE")
  ].join("|");
}

function timelineBounds(events: DashboardAgendaItem[]) {
  const starts = events.map((event) => minutesOfDay(event.start)).filter((value) => value >= 0);
  const ends = events.map((event) => minutesOfDay(event.end ?? event.start)).filter((value) => value >= 0);
  const firstStart = starts.length ? Math.min(...starts) : 8 * 60;
  const lastEnd = ends.length ? Math.max(...ends) : 18 * 60;
  const startHour = Math.max(7, Math.floor(firstStart / 60));
  const endHour = Math.min(22, Math.ceil(lastEnd / 60));
  const hours = Array.from({ length: Math.max(1, endHour - startHour + 1) }, (_, index) => startHour + index);
  return {
    endHour,
    height: Math.max(1, endHour - startHour) * HOUR_HEIGHT,
    hours,
    startHour
  };
}

function isoDateKey(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function eventPlacement(event: DashboardAgendaItem, timeline: ReturnType<typeof timelineBounds>) {
  const start = minutesOfDay(event.start);
  const end = minutesOfDay(event.end ?? event.start);
  const top = ((start - timeline.startHour * 60) / 60) * HOUR_HEIGHT;
  const duration = Math.max(30, end - start);
  return {
    height: Math.max(MIN_SLOT_HEIGHT, (duration / 60) * HOUR_HEIGHT - 8),
    top: Math.max(0, top)
  };
}

function minutesOfDay(value: string): number {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return -1;
  }
  return date.getHours() * 60 + date.getMinutes();
}

function hourTop(hour: number, timeline: ReturnType<typeof timelineBounds>): number {
  return (hour - timeline.startHour) * HOUR_HEIGHT;
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatTime(start: string, end?: string | null): string {
  return formatDateRange(start, end).replace(/^[^,]+,\s*/, "");
}

function courseColor(summary: string) {
  const key = courseKey(summary);
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  const hue = (hash * 137.508) % 360;
  return {
    accent: `hsl(${hue.toFixed(0)} 68% 42%)`,
    background: `hsl(${hue.toFixed(0)} 72% 96%)`,
    focus: `hsl(${hue.toFixed(0)} 72% 48% / 0.2)`
  };
}

function courseKey(summary: string): string {
  const code = summary.match(/\b[A-Z]{2,}\s?\d{3,}[A-Z]?\b/i)?.[0];
  return (code ?? summary).replace(/\s+/g, "").toUpperCase();
}

function findCourseAssignment(
  assignments: AlmaTimetableCourseAssignment[],
  event: DashboardAgendaItem | null
): AlmaTimetableCourseAssignment | null {
  if (!event) {
    return null;
  }
  const summaryKey = normalizeCourseSummary(event.summary);
  return assignments.find((assignment) => normalizeCourseSummary(assignment.summary) === summaryKey) ?? null;
}

function normalizeCourseSummary(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("de-DE");
}
