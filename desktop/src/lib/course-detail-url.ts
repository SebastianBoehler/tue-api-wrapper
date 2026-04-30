import type { DashboardAgendaItem } from "./dashboard-types";

export function extractCourseDetailUrl(item: DashboardAgendaItem): string | null {
  const source = item.description ?? "";
  const match = source.match(/https?:\/\/[^\s<>"']+\/alma\/[^\s<>"']+/i);
  return match?.[0] ?? null;
}

export function courseNavigationUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
