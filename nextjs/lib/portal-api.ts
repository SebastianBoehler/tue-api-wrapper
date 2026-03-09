import { mockDashboard, mockDocuments, mockIliasLinks } from "./mock-data";
import type { DashboardData, DocumentReport, PortalLink } from "./types";

const apiBaseUrl = process.env.PORTAL_API_BASE_URL ?? "http://127.0.0.1:8000";

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function getDashboard(): Promise<DashboardData> {
  return fetchJson("/api/dashboard", mockDashboard);
}

export function getDocuments(): Promise<DocumentReport[]> {
  return fetchJson("/api/alma/documents", mockDocuments);
}

export async function getIliasLinks(): Promise<PortalLink[]> {
  const data = await fetchJson("/api/ilias/root", {
    mainbar_links: mockDashboard.ilias.mainbarLinks,
    top_categories: mockDashboard.ilias.topCategories
  });

  return [...data.mainbar_links, ...data.top_categories];
}
