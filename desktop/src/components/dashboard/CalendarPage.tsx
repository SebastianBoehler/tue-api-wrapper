import { useEffect, useMemo, useState, type CSSProperties } from "react";

import type { AlmaTimetableCourseAssignment, DashboardAgendaItem } from "../../lib/dashboard-types";
import { courseLookupQuery, extractCourseDetailUrl } from "../../lib/course-detail-url";
import {
  courseColor,
  dedupeEvents,
  defaultWeekIndex,
  eventKey,
  eventPlacement,
  filterUpcomingEvents,
  groupEventsByWeek,
  hourLabel,
  hourTop,
  normalizeCourseSummary,
  timelineBounds
} from "./calendar-schedule";
import { EmptyState } from "./DashboardPrimitives";
import type { CourseNavigationProps, DashboardPageProps } from "./types";

export function CalendarPage({ data, onOpenCourseDetail }: DashboardPageProps & CourseNavigationProps) {
  const rawEvents = data?.agenda.items ?? [];
  const dedupedEvents = useMemo(() => dedupeEvents(rawEvents), [rawEvents]);
  const events = useMemo(() => filterUpcomingEvents(dedupedEvents), [dedupedEvents]);
  const weeks = useMemo(() => groupEventsByWeek(events), [events]);
  const [weekIndex, setWeekIndex] = useState(0);
  const week = weeks[weekIndex] ?? null;
  const days = week?.days ?? [];
  const timeline = useMemo(() => timelineBounds(events), [events]);
  const [selectedEvent, setSelectedEvent] = useState<DashboardAgendaItem | null>(null);
  const hiddenDuplicates = rawEvents.length - dedupedEvents.length;

  useEffect(() => {
    setWeekIndex((current) => {
      if (!weeks.length) return 0;
      if (weeks[current]) return current;
      return defaultWeekIndex(weeks);
    });
  }, [weeks]);

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
              <span>{week?.label ?? "No week"} · {events.length} events{hiddenDuplicates ? ` · ${hiddenDuplicates} duplicate hidden` : ""}</span>
              <div className="schedule-week-controls">
                <button
                  className="ghost-button compact-button"
                  disabled={weekIndex <= 0}
                  onClick={() => setWeekIndex((index) => Math.max(0, index - 1))}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="ghost-button compact-button"
                  disabled={weekIndex >= weeks.length - 1}
                  onClick={() => setWeekIndex((index) => Math.min(weeks.length - 1, index + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
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
              style={{ gridTemplateColumns: "54px repeat(7, minmax(0, 1fr))" }}
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
                    {day.items.length === 0 ? <span className="schedule-empty-day">No courses</span> : null}
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

function formatTime(start: string, end?: string | null): string {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return "Time pending";

  const formatter = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  });
  if (!end) return formatter.format(startDate);

  const endDate = new Date(end);
  return Number.isNaN(endDate.getTime())
    ? formatter.format(startDate)
    : `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
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
