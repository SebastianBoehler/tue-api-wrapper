import { useEffect, useMemo, useState } from "react";

import type { DashboardAgendaItem } from "../../lib/dashboard-types";
import { formatDateRange } from "../../lib/format";
import { EmptyState, PanelHeader } from "./DashboardPrimitives";
import { CourseDetailPanel } from "./CourseDetailPanel";
import type { DashboardPageProps } from "./types";

export function CalendarPage({ data, state }: DashboardPageProps) {
  const events = useMemo(() => data?.agenda.items ?? [], [data?.agenda.items]);
  const days = useMemo(() => groupEventsByDay(events), [events]);
  const [selectedEvent, setSelectedEvent] = useState<DashboardAgendaItem | null>(events[0] ?? null);

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
                    {day.items.map((item) => (
                      <button
                        key={`${item.summary}-${item.start}`}
                        className={selectedEvent === item ? "schedule-slot active" : "schedule-slot"}
                        onClick={() => setSelectedEvent(item)}
                        type="button"
                      >
                        <time>{formatTime(item.start, item.end)}</time>
                        <strong>{item.summary}</strong>
                        <span>{item.location || "Location pending"}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState>No timetable events returned for this term.</EmptyState>
          )}
        </article>
      </section>

      <CourseDetailPanel baseUrl={state.backendUrl ?? null} event={selectedEvent} term={data?.termLabel} />
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
