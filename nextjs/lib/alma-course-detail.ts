import type { AlmaCourseSearchResult } from "./discovery-types";
import type { AgendaItem } from "./types";

const ALMA_DETAIL_URL_PATTERN = /https:\/\/alma\.uni-tuebingen\.de\/[^\s"'<>)]*?_flowId=detailView-flow[^\s"'<>)]*/i;

export function extractAlmaDetailUrlFromDescription(description: string | null | undefined): string | null {
  if (!description) {
    return null;
  }

  const match = description.match(ALMA_DETAIL_URL_PATTERN);
  return match ? match[0].replace(/&amp;/g, "&") : null;
}

export function buildAgendaCourseDetailHref(item: AgendaItem, term: string | null | undefined): string {
  const params = new URLSearchParams();
  const detailUrl = extractAlmaDetailUrlFromDescription(item.description);

  if (detailUrl) {
    params.set("url", detailUrl);
  } else {
    params.set("title", item.summary);
  }

  if (term?.trim()) {
    params.set("term", term.trim());
  }

  return `/courses/detail?${params.toString()}`;
}

export function normalizeCourseTitle(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

export function dedupeCourseSearchResults(results: AlmaCourseSearchResult[]): AlmaCourseSearchResult[] {
  const unique = new Map<string, AlmaCourseSearchResult>();

  for (const result of results) {
    const key = [
      result.detail_url ?? "",
      normalizeCourseTitle(result.title),
      result.number ?? "",
      result.event_type ?? ""
    ].join("::");

    if (!unique.has(key)) {
      unique.set(key, result);
    }
  }

  return Array.from(unique.values());
}
