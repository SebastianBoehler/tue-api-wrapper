import { mockDashboard, mockSearchItems } from "./mock-data.js";
import type { DashboardPayload, SearchItem } from "./types.js";

const apiBaseUrl = process.env.PORTAL_API_BASE_URL;

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  if (!apiBaseUrl) {
    return fallback;
  }

  try {
    const response = await fetch(`${apiBaseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function loadDashboard(term = "Sommer 2026"): Promise<DashboardPayload> {
  return fetchJson(`/api/dashboard?term=${encodeURIComponent(term)}`, mockDashboard);
}

export function loadDocuments() {
  return fetchJson("/api/alma/documents", mockDashboard.documents);
}

export async function searchItems(query: string): Promise<SearchItem[]> {
  const fallback = mockSearchItems.filter((item) =>
    `${item.title}\n${item.text}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  const response = await fetchJson(`/api/search?query=${encodeURIComponent(query)}`, {
    results: fallback
  });

  return response.results;
}

export async function fetchItem(id: string): Promise<SearchItem> {
  const fallback =
    mockSearchItems.find((item) => item.id === id) ??
    ({
      id,
      title: "Unknown item",
      url: "https://alma.uni-tuebingen.de/",
      text: "No matching item was found in the unified mock dataset."
    } satisfies SearchItem);

  return fetchJson(`/api/items/${encodeURIComponent(id)}`, fallback);
}
