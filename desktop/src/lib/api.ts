import type { DashboardData } from "./dashboard-types";
import type { CampusCanteen, CampusSnapshot, KufTrainingOccupancy, UniversityCalendarResponse } from "./campus-types";
import type { UnifiedCourseDetail } from "./course-types";
import type { MailboxSummary, MailInboxSummary } from "./mail-types";
import type { DirectoryAction, DirectoryForm, DirectorySearchResponse } from "./people-types";
import type { TimmsItemDetail, TimmsSearchPage, TimmsStreamVariant, TimmsTreePage } from "./timms-types";

export async function fetchDashboard(baseUrl: string): Promise<DashboardData> {
  return fetchJson<DashboardData>(baseUrl, "/api/dashboard");
}

export async function fetchCampusSnapshot(baseUrl: string): Promise<CampusSnapshot> {
  const errors: string[] = [];
  const [canteens, events, fitness] = await Promise.all([
    fetchJson<CampusCanteen[]>(baseUrl, "/api/campus/canteens").catch((error) => {
      errors.push(errorMessage("Campus food", error));
      return undefined;
    }),
    fetchJson<UniversityCalendarResponse>(baseUrl, "/api/campus/events?limit=6").catch((error) => {
      errors.push(errorMessage("Campus events", error));
      return undefined;
    }),
    fetchJson<KufTrainingOccupancy>(baseUrl, "/api/campus/fitness/kuf").catch((error) => {
      errors.push(errorMessage("KUF occupancy", error));
      return undefined;
    })
  ]);

  return {
    canteens,
    events,
    fitness,
    errors
  };
}

export async function fetchCourseDetail(
  baseUrl: string,
  input: { title: string; url?: string | null; term?: string | null }
): Promise<UnifiedCourseDetail> {
  const params = new URLSearchParams();
  if (input.url) {
    params.set("url", input.url);
  }
  params.set("title", input.title);
  if (input.term) {
    params.set("term", input.term);
  }
  return fetchJson<UnifiedCourseDetail>(baseUrl, `/api/course-detail?${params.toString()}`);
}

export async function fetchMailboxes(baseUrl: string): Promise<MailboxSummary[]> {
  return fetchJson<MailboxSummary[]>(baseUrl, "/api/mail/mailboxes");
}

export async function fetchMailInbox(
  baseUrl: string,
  options: { mailbox: string; unreadOnly: boolean; query: string }
): Promise<MailInboxSummary> {
  const params = new URLSearchParams({
    mailbox: options.mailbox,
    limit: "30",
    unread_only: String(options.unreadOnly)
  });
  if (options.query.trim()) {
    params.set("query", options.query.trim());
  }
  return fetchJson<MailInboxSummary>(baseUrl, `/api/mail/inbox?${params.toString()}`);
}

export async function moveMailMessage(
  baseUrl: string,
  input: { uid: string; mailbox: string; destination: string }
): Promise<void> {
  await fetchJson(baseUrl, `/api/mail/messages/${encodeURIComponent(input.uid)}/move`, {
    method: "POST",
    body: JSON.stringify({ mailbox: input.mailbox, destination: input.destination })
  });
}

export async function searchTimms(baseUrl: string, query: string): Promise<TimmsSearchPage> {
  return fetchJson<TimmsSearchPage>(baseUrl, `/api/timms/search?query=${encodeURIComponent(query)}&limit=12`);
}

export async function fetchTimmsItem(baseUrl: string, itemId: string): Promise<TimmsItemDetail> {
  return fetchJson<TimmsItemDetail>(baseUrl, `/api/timms/items/${encodeURIComponent(itemId)}`);
}

export async function fetchTimmsStreams(baseUrl: string, itemId: string): Promise<TimmsStreamVariant[]> {
  return fetchJson<TimmsStreamVariant[]>(baseUrl, `/api/timms/items/${encodeURIComponent(itemId)}/streams`);
}

export async function fetchTimmsTree(
  baseUrl: string,
  input: { nodeId?: string | null; nodePath?: string | null } = {}
): Promise<TimmsTreePage> {
  const params = new URLSearchParams();
  if (input.nodeId) {
    params.set("node_id", input.nodeId);
  }
  if (input.nodePath) {
    params.set("node_path", input.nodePath);
  }
  return fetchJson<TimmsTreePage>(baseUrl, `/api/timms/tree${params.size ? `?${params.toString()}` : ""}`);
}

export async function searchPeople(baseUrl: string, query: string): Promise<DirectorySearchResponse> {
  return fetchJson<DirectorySearchResponse>(baseUrl, `/api/people/search?query=${encodeURIComponent(query)}`);
}

export async function submitPeopleAction(
  baseUrl: string,
  input: { query: string; form: DirectoryForm; action: DirectoryAction }
): Promise<DirectorySearchResponse> {
  return fetchJson<DirectorySearchResponse>(baseUrl, "/api/people/action", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function fetchJson<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
    ...init
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(readErrorDetail(detail) || `Request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

function readErrorDetail(payload: string): string | null {
  if (!payload) {
    return null;
  }
  try {
    const parsed = JSON.parse(payload) as { detail?: unknown };
    return typeof parsed.detail === "string" ? parsed.detail : payload;
  } catch {
    return payload;
  }
}

function errorMessage(scope: string, error: unknown): string {
  return `${scope}: ${error instanceof Error ? error.message : "Request failed."}`;
}
