import { buildPortalApiUrl, PortalApiError } from "./portal-api";
import type { UnifiedCourseDetail } from "./course-detail-types";

async function fetchCourseDetailJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildPortalApiUrl(path), { cache: "no-store" });
  } catch {
    throw new PortalApiError("Could not reach the backend for the combined course detail.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new PortalApiError(
      `Backend request failed for ${path} with ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }

  return (await response.json()) as T;
}

export function getUnifiedCourseDetail({
  url = "",
  title = "",
  term = "",
  iliasLimit = 8
}: {
  url?: string;
  title?: string;
  term?: string;
  iliasLimit?: number;
}): Promise<UnifiedCourseDetail> {
  const params = new URLSearchParams();
  if (url.trim()) {
    params.set("url", url.trim());
  }
  if (title.trim()) {
    params.set("title", title.trim());
  }
  if (term.trim()) {
    params.set("term", term.trim());
  }
  params.set("ilias_limit", String(iliasLimit));
  return fetchCourseDetailJson(`/api/course-detail?${params.toString()}`);
}
