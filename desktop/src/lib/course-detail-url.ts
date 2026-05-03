import type { DashboardAgendaItem } from "./dashboard-types";

export function extractCourseDetailUrl(item: DashboardAgendaItem): string | null {
  const source = item.description ?? "";
  const match = source.match(/https?:\/\/[^\s<>"']+\/alma\/[^\s<>"']+/i);
  return match?.[0] ?? null;
}

export function courseNavigationUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function courseLookupQuery(title: string): string {
  return title.match(/\b[A-Z]{2,12}[-\s]?\d{2,5}[A-Z]?\b/)?.[0] ?? title;
}

export function stripCourseCode(title: string): string {
  return title.replace(/^[A-Z]{2,12}[-\s]?\d{2,5}[A-Z]?\s+/i, "").trim() || title;
}
