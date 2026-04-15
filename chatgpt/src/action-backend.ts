import { PortalBackendError } from "./backend.js";
import type { CriticalActionResult } from "./types/actions.js";

const apiBaseUrl = process.env.PORTAL_API_BASE_URL;

function requireBaseUrl(): string {
  if (!apiBaseUrl) {
    throw new PortalBackendError("PORTAL_API_BASE_URL is not configured. Critical actions need the live backend.");
  }
  return apiBaseUrl;
}

function queryString(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = requireBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, init);
  } catch {
    throw new PortalBackendError(`Could not reach the backend at ${baseUrl}.`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new PortalBackendError(
      `Backend request failed for ${path} with ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

function actionResult(raw: Record<string, unknown>): CriticalActionResult {
  const finalUrl = raw.final_url ?? raw.page_url ?? raw.course_url ?? null;
  return {
    status: String(raw.status ?? raw.success ?? "submitted"),
    message: typeof raw.message === "string" ? raw.message : null,
    finalUrl: typeof finalUrl === "string" ? finalUrl : null,
    raw,
  };
}

export interface AlmaRegistrationSupport {
  detail_url: string;
  title: string | null;
  number: string | null;
  supported: boolean;
  action: string | null;
  status: string | null;
  messages: string[];
  message: string | null;
}

export interface IliasWaitlistSupport {
  supported: boolean;
  requires_agreement: boolean;
  join_url: string | null;
  message: string | null;
}

export interface MoodleEnrolmentSupport {
  course_id: number | null;
  title: string;
  course_url: string | null;
  source_url: string;
  self_enrolment_available: boolean;
  requires_enrolment_key: boolean;
  enrolment_label: string | null;
}

export function loadAlmaRegistrationSupport(url: string): Promise<AlmaRegistrationSupport> {
  return fetchJson(`/api/alma/course-registration/support${queryString({ url })}`);
}

export function loadIliasWaitlistSupport(url: string): Promise<IliasWaitlistSupport> {
  return fetchJson(`/api/ilias/waitlist/support${queryString({ url })}`);
}

export function loadMoodleEnrolmentSupport(courseId: number): Promise<MoodleEnrolmentSupport> {
  return fetchJson(`/api/moodle/course/${courseId}/enrolment`);
}

export async function registerForAlmaCourse(url: string, planelementId?: string): Promise<CriticalActionResult> {
  const raw = await fetchJson<Record<string, unknown>>(
    `/api/alma/course-registration${queryString({ url, planelement_id: planelementId })}`,
    { method: "POST" },
  );
  return actionResult(raw);
}

export async function addIliasFavorite(url: string): Promise<CriticalActionResult> {
  const raw = await fetchJson<Record<string, unknown>>(
    `/api/ilias/favorites${queryString({ url })}`,
    { method: "POST" },
  );
  return actionResult(raw);
}

export async function joinIliasWaitlist(url: string, acceptAgreement: boolean): Promise<CriticalActionResult> {
  const raw = await fetchJson<Record<string, unknown>>(
    `/api/ilias/waitlist/join${queryString({ url, accept_agreement: acceptAgreement })}`,
    { method: "POST" },
  );
  return actionResult(raw);
}

export async function enrolInMoodleCourse(courseId: number, enrolmentKey?: string): Promise<CriticalActionResult> {
  const body = new URLSearchParams();
  if (enrolmentKey) {
    body.set("enrolment_key", enrolmentKey);
  }
  const raw = await fetchJson<Record<string, unknown>>(`/api/moodle/course/${courseId}/enrol`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  return actionResult(raw);
}
