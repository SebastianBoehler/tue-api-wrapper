import { useEffect, useMemo, useState, type CSSProperties } from "react";

import type { AlmaTimetableCourseAssignment, DashboardAgendaItem } from "../../lib/dashboard-types";
import { formatDateRange } from "../../lib/format";
import { EmptyState, PanelHeader } from "./DashboardPrimitives";
import { CourseDetailPanel } from "./CourseDetailPanel";
import type { DashboardPageProps } from "./types";

export function CalendarPage({ data, state }: DashboardPageProps) {
  const events = useMemo(() => data?.agenda.items ?? [], [data?.agenda.items]);
  const days = useMemo(() => groupEventsByDay(events), [events]);
  const [selectedEvent, setSelectedEvent] = useState<DashboardAgendaItem | null>(events[0] ?? null);
  const selectedAssignment = useMemo(
    () => findCourseAssignment(data?.study.currentSemesterCourses ?? [], selectedEvent),
    [data?.study.currentSemesterCourses, selectedEvent]
  );

  useEffect(() => {
    setSelectedEvent((current) => current ?? events[0] ?? null);
  }, [events]);

  return (
    <div className="schedule-layout">
      <section className="schedule-main">
        <div className="panel section-hero">
          <div>
            <p className="eyebrow">Calendar</p>
            <h2>Weekly schedule</h2>
            <p className="muted">Days, slots, rooms, and course detail lookup from the local desktop runtime.</p>
          </div>
          {data?.agenda.exportUrl ? (
            <button className="secondary-button" onClick={() => void window.desktop.openExternal(data.agenda.exportUrl ?? "")} type="button">
              Open calendar export
            </button>
          ) : null}
        </div>

        <article className="panel">
          <PanelHeader title="Timetable" meta={`${days.length} days · ${events.length} events`} />
          {days.length > 0 ? (
            <div className="schedule-board">
              {days.map((day) => (
                <section key={day.key} className="schedule-day">
                  <div className="schedule-day-header">
                    <strong>{day.weekday}</strong>
                    <span>{day.dateLabel}</span>
                  </div>
                  <div className="schedule-slots">
                    {day.items.map((item) => {
                      const color = courseColor(item.summary);
                      return (
                        <button
                          key={`${item.summary}-${item.start}`}
                          className={selectedEvent === item ? "schedule-slot active" : "schedule-slot"}
                          onClick={() => setSelectedEvent(item)}
                          style={
                            {
                              "--course-accent": color.accent,
                              "--course-bg": color.background,
                              "--course-focus": color.focus
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

      <CourseDetailPanel
        assignment={selectedAssignment}
        baseUrl={state.backendUrl ?? null}
        event={selectedEvent}
        term={data?.termLabel}
      />
    </div>
  );
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

function formatTime(start: string, end?: string | null): string {
  return formatDateRange(start, end).replace(/^[^,]+,\s*/, "");
}

const coursePalette = [
  { accent: "#b0163a", background: "#fff3f5", focus: "rgba(176, 22, 58, 0.18)" },
  { accent: "#2563eb", background: "#eff6ff", focus: "rgba(37, 99, 235, 0.18)" },
  { accent: "#047857", background: "#ecfdf5", focus: "rgba(4, 120, 87, 0.18)" },
  { accent: "#7c3aed", background: "#f5f3ff", focus: "rgba(124, 58, 237, 0.18)" },
  { accent: "#b45309", background: "#fffbeb", focus: "rgba(180, 83, 9, 0.2)" },
  { accent: "#0f766e", background: "#f0fdfa", focus: "rgba(15, 118, 110, 0.18)" },
  { accent: "#be123c", background: "#fff1f2", focus: "rgba(190, 18, 60, 0.18)" },
  { accent: "#4338ca", background: "#eef2ff", focus: "rgba(67, 56, 202, 0.18)" }
] as const;

function courseColor(summary: string) {
  const key = courseKey(summary);
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return coursePalette[hash % coursePalette.length];
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
