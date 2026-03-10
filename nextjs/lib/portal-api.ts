import type {
  IliasContentPage,
  IliasExerciseAssignment,
  IliasForumTopic,
  IliasMembershipItem,
  IliasTaskItem,
  ModuleDetail,
  DashboardData,
  DocumentsPanel,
  EnrollmentState,
  ExamItem,
  ModuleSearchFiltersResponse,
  ModuleSearchResponse,
  PortalLink
} from "./types";

const apiBaseUrl = process.env.PORTAL_API_BASE_URL ?? "http://127.0.0.1:8000";

export function buildPortalApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${apiBaseUrl}${path}`;
}

export class PortalApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalApiError";
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      cache: "no-store"
    });
  } catch (error) {
    throw new PortalApiError(
      `Could not reach the backend at ${apiBaseUrl}. Start the Python API or set PORTAL_API_BASE_URL correctly.`
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new PortalApiError(
      `Backend request failed for ${path} with ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }

  return (await response.json()) as T;
}

export function getDashboard(): Promise<DashboardData> {
  return fetchJson("/api/dashboard");
}

export function getDocuments(): Promise<DocumentsPanel> {
  return fetchJson("/api/alma/studyservice");
}

export function getAlmaExams(limit = 20): Promise<ExamItem[]> {
  return fetchJson(`/api/alma/exams?limit=${limit}`);
}

export function getAlmaEnrollment(): Promise<EnrollmentState> {
  return fetchJson("/api/alma/enrollments");
}

export async function getIliasLinks(): Promise<PortalLink[]> {
  const data = await fetchJson<{
    mainbar_links: PortalLink[];
    top_categories: PortalLink[];
  }>("/api/ilias/root");

  return [...data.mainbar_links, ...data.top_categories];
}

export function getIliasContent(target: string): Promise<IliasContentPage> {
  return fetchJson(`/api/ilias/content?target=${encodeURIComponent(target)}`);
}

export function getIliasForum(target: string): Promise<IliasForumTopic[]> {
  return fetchJson(`/api/ilias/forum?target=${encodeURIComponent(target)}`);
}

export function getIliasExercise(target: string): Promise<IliasExerciseAssignment[]> {
  return fetchJson(`/api/ilias/exercise?target=${encodeURIComponent(target)}`);
}

export function getIliasMemberships(limit = 20): Promise<IliasMembershipItem[]> {
  return fetchJson(`/api/ilias/memberships?limit=${limit}`);
}

export function getIliasTasks(limit = 20): Promise<IliasTaskItem[]> {
  return fetchJson(`/api/ilias/tasks?limit=${limit}`);
}

export function getModuleSearchFilters(): Promise<ModuleSearchFiltersResponse> {
  return fetchJson("/api/alma/module-search/filters");
}

export function getModuleDetail(url: string): Promise<ModuleDetail> {
  return fetchJson(`/api/alma/module-detail?url=${encodeURIComponent(url)}`);
}

export function buildAlmaDocumentUrl(docId: string): string {
  return buildPortalApiUrl(`/api/alma/documents/${encodeURIComponent(docId)}`);
}

export async function searchModules({
  query = "",
  title = "",
  number = "",
  elementTypes = [],
  languages = [],
  degrees = [],
  subjects = [],
  faculties = [],
  maxResults = 100
}: {
  query?: string;
  title?: string;
  number?: string;
  elementTypes?: string[];
  languages?: string[];
  degrees?: string[];
  subjects?: string[];
  faculties?: string[];
  maxResults?: number;
}): Promise<ModuleSearchResponse> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("query", query.trim());
  }
  if (title.trim()) {
    params.set("title", title.trim());
  }
  if (number.trim()) {
    params.set("number", number.trim());
  }
  for (const value of elementTypes) {
    params.append("element_type", value);
  }
  for (const value of languages) {
    params.append("language", value);
  }
  for (const value of degrees) {
    params.append("degree", value);
  }
  for (const value of subjects) {
    params.append("subject", value);
  }
  for (const value of faculties) {
    params.append("faculty", value);
  }
  params.set("max_results", String(maxResults));

  return fetchJson(`/api/alma/module-search?${params.toString()}`);
}
