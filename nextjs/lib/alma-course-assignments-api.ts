import type { AlmaTimetableCourseAssignmentsPage } from "./discovery-types";
import { buildPortalApiUrl, PortalApiError } from "./portal-api";

async function fetchAssignmentsJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildPortalApiUrl(path), { cache: "no-store" });
  } catch {
    throw new PortalApiError("Could not reach the backend while loading Alma course credits.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new PortalApiError(
      `Backend request failed for ${path} with ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }

  return (await response.json()) as T;
}

export function getAlmaTimetableCourseAssignments(
  term = "",
  limit = 100
): Promise<AlmaTimetableCourseAssignmentsPage> {
  const params = new URLSearchParams();
  if (term.trim()) {
    params.set("term", term.trim());
  }
  params.set("limit", String(limit));
  return fetchAssignmentsJson(`/api/alma/timetable/course-assignments?${params.toString()}`);
}
