import type { DashboardAgendaItem } from "../../lib/dashboard-types";

export const HOUR_HEIGHT = 58;
export const MIN_SLOT_HEIGHT = 74;

export interface ScheduleDay {
  key: string;
  weekday: string;
  dateLabel: string;
  items: DashboardAgendaItem[];
}

export interface ScheduleWeek {
  key: string;
  label: string;
  days: ScheduleDay[];
}

export function groupEventsByWeek(events: DashboardAgendaItem[]): ScheduleWeek[] {
  const formatter = new Intl.DateTimeFormat("de-DE", { weekday: "short" });
  const dateFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" });
  const anchor = startOfDay(new Date());
  const anchorKey = localDateKey(anchor);
  const groups = new Map<string, DashboardAgendaItem[]>();

  for (const event of events) {
    const date = new Date(event.start);
    if (Number.isNaN(date.getTime())) continue;
    const key = localDateKey(date);
    if (key < anchorKey) continue;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  const eventDays = [...groups.keys()].map(dateFromKey).sort((left, right) => left.getTime() - right.getTime());
  const firstDay = anchor;
  const lastDay = eventDays[eventDays.length - 1] ?? addDays(anchor, 6);

  const start = firstDay;
  const end = lastDay;
  const dayCount = Math.max(1, daysBetween(start, end) + 1);
  const weeks: ScheduleWeek[] = [];

  for (let offset = 0; offset < dayCount; offset += 7) {
    const weekStart = addDays(start, offset);
    const days = Array.from({ length: 7 }, (_, dayOffset) => {
      const date = addDays(weekStart, dayOffset);
      const key = localDateKey(date);
      const items = groups.get(key) ?? [];
      return {
        key,
        weekday: formatter.format(date),
        dateLabel: dateFormatter.format(date),
        items: items.sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
      };
    });
    weeks.push({ key: localDateKey(weekStart), label: weekLabel(days), days });
  }

  return weeks;
}

export function filterUpcomingEvents(events: DashboardAgendaItem[]): DashboardAgendaItem[] {
  const anchorKey = localDateKey(new Date());
  return events.filter((event) => {
    const end = new Date(event.end ?? event.start);
    if (Number.isNaN(end.getTime())) return false;
    return localDateKey(end) >= anchorKey;
  });
}

export function defaultWeekIndex(weeks: ScheduleWeek[]): number {
  const todayKey = localDateKey(new Date());
  const currentWeekIndex = weeks.findIndex((week) => week.days.some((day) => day.key === todayKey));
  if (currentWeekIndex >= 0) return currentWeekIndex;
  const firstWithEvents = weeks.findIndex((week) => week.days.some((day) => day.items.length > 0));
  return Math.max(0, firstWithEvents);
}

export function dedupeEvents(events: DashboardAgendaItem[]): DashboardAgendaItem[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = eventKey(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function eventKey(event: DashboardAgendaItem): string {
  return [
    normalizeCourseSummary(event.summary),
    isoDateKey(event.start),
    event.end ? isoDateKey(event.end) : "",
    (event.location ?? "").replace(/\s+/g, " ").trim().toLocaleLowerCase("de-DE")
  ].join("|");
}

export function timelineBounds(events: DashboardAgendaItem[]) {
  const starts = events.map((event) => minutesOfDay(event.start)).filter((value) => value >= 0);
  const ends = events.map((event) => minutesOfDay(event.end ?? event.start)).filter((value) => value >= 0);
  const firstStart = starts.length ? Math.min(...starts) : 8 * 60;
  const lastEnd = ends.length ? Math.max(...ends) : 18 * 60;
  const startHour = Math.max(7, Math.floor(firstStart / 60));
  const endHour = Math.min(22, Math.ceil(lastEnd / 60));
  const hours = Array.from({ length: Math.max(1, endHour - startHour + 1) }, (_, index) => startHour + index);
  return { endHour, height: Math.max(1, endHour - startHour) * HOUR_HEIGHT, hours, startHour };
}

export function eventPlacement(event: DashboardAgendaItem, timeline: ReturnType<typeof timelineBounds>) {
  const start = minutesOfDay(event.start);
  const end = minutesOfDay(event.end ?? event.start);
  const top = ((start - timeline.startHour * 60) / 60) * HOUR_HEIGHT;
  const duration = Math.max(30, end - start);
  return { height: Math.max(MIN_SLOT_HEIGHT, (duration / 60) * HOUR_HEIGHT - 8), top: Math.max(0, top) };
}

export function hourTop(hour: number, timeline: ReturnType<typeof timelineBounds>): number {
  return (hour - timeline.startHour) * HOUR_HEIGHT;
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function courseColor(summary: string) {
  const key = courseKey(summary);
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const hue = (hash * 137.508) % 360;
  return {
    accent: `hsl(${hue.toFixed(0)} 68% 42%)`,
    background: `hsl(${hue.toFixed(0)} 72% 96%)`,
    focus: `hsl(${hue.toFixed(0)} 72% 48% / 0.2)`
  };
}

export function normalizeCourseSummary(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("de-DE");
}

function weekLabel(days: ScheduleDay[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  return first && last ? `${first.dateLabel} – ${last.dateLabel}` : "Week";
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

function isoDateKey(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function minutesOfDay(value: string): number {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? -1 : date.getHours() * 60 + date.getMinutes();
}

function courseKey(summary: string): string {
  const code = summary.match(/\b[A-Z]{2,}\s?\d{3,}[A-Z]?\b/i)?.[0];
  return (code ?? summary).replace(/\s+/g, "").toUpperCase();
}
