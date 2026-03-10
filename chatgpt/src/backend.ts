import type {
  AlmaCourseSearchFiltersPayload,
  AlmaCourseSearchResponse,
  AlmaExamRecord,
  AlmaTimetablePayload,
  DashboardPayload,
  IliasMembershipItem,
  IliasTaskItem,
  SearchItem
} from "./types.js";

const apiBaseUrl = process.env.PORTAL_API_BASE_URL;
const defaultTerm = "Sommer 2026";

export function buildPortalApiUrl(path: string): string {
  if (!apiBaseUrl) {
    throw new PortalBackendError(
      "PORTAL_API_BASE_URL is not configured. The ChatGPT app is now live-data only."
    );
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${apiBaseUrl}${path}`;
}

export class PortalBackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalBackendError";
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  if (!apiBaseUrl) {
    throw new PortalBackendError(
      "PORTAL_API_BASE_URL is not configured. The ChatGPT app is now live-data only."
    );
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`);
  } catch {
    throw new PortalBackendError(`Could not reach the backend at ${apiBaseUrl}.`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new PortalBackendError(
      `Backend request failed for ${path} with ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }

  return (await response.json()) as T;
}

function buildQueryString(params: Record<string, string | number | readonly string[] | undefined>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item.trim()) {
          query.append(key, item);
        }
      }
      continue;
    }

    query.set(key, String(value));
  }

  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
}

function normalizeDashboard(dashboard: DashboardPayload): DashboardPayload {
  return {
    ...dashboard,
    documents: {
      ...dashboard.documents,
      currentDownloadUrl: dashboard.documents.currentDownloadUrl
        ? buildPortalApiUrl(dashboard.documents.currentDownloadUrl)
        : null
    }
  };
}

export interface CourseCatalogSearchParams {
  query?: string;
  title?: string;
  number?: string;
  elementType?: readonly string[];
  language?: readonly string[];
  degree?: readonly string[];
  subject?: readonly string[];
  faculty?: readonly string[];
  maxResults?: number;
}

export async function loadDashboard(term = defaultTerm): Promise<DashboardPayload> {
  const dashboard = await fetchJson<DashboardPayload>(
    `/api/dashboard?term=${encodeURIComponent(term)}`
  );
  return normalizeDashboard(dashboard);
}

export async function loadTasks(limit = 8): Promise<IliasTaskItem[]> {
  return fetchJson<IliasTaskItem[]>(`/api/ilias/tasks?limit=${limit}`);
}

export async function loadMemberships(limit = 8): Promise<IliasMembershipItem[]> {
  return fetchJson<IliasMembershipItem[]>(`/api/ilias/memberships?limit=${limit}`);
}

export async function loadExams(limit = 8): Promise<AlmaExamRecord[]> {
  return fetchJson<AlmaExamRecord[]>(`/api/alma/exams?limit=${limit}`);
}

export async function loadTimetable(term = defaultTerm): Promise<AlmaTimetablePayload> {
  return fetchJson<AlmaTimetablePayload>(`/api/alma/timetable?term=${encodeURIComponent(term)}`);
}

export async function loadEnrollments(): Promise<DashboardPayload["enrollment"]> {
  return fetchJson<DashboardPayload["enrollment"]>("/api/alma/enrollments");
}

export async function loadCourseCatalogFilters(): Promise<AlmaCourseSearchFiltersPayload> {
  return fetchJson<AlmaCourseSearchFiltersPayload>("/api/alma/module-search/filters");
}

export async function searchCourseCatalog(
  params: CourseCatalogSearchParams
): Promise<AlmaCourseSearchResponse> {
  const query = buildQueryString({
    query: params.query?.trim(),
    title: params.title?.trim(),
    number: params.number?.trim(),
    element_type: params.elementType,
    language: params.language,
    degree: params.degree,
    subject: params.subject,
    faculty: params.faculty,
    max_results: params.maxResults ?? 10
  });

  return fetchJson<AlmaCourseSearchResponse>(`/api/alma/module-search${query}`);
}

export async function searchItems(query: string): Promise<SearchItem[]> {
  const response = await fetchJson<{ results: SearchItem[] }>(
    `/api/search?query=${encodeURIComponent(query)}`
  );

  return response.results;
}

export async function fetchItem(id: string): Promise<SearchItem> {
  return fetchJson(`/api/items/${encodeURIComponent(id)}`);
}
