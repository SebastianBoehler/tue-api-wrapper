import { buildPortalApiUrl, PortalBackendError } from "./backend.js";
import type { UnifiedCourseDetail } from "./types/course.js";

async function fetchCourseDetailJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildPortalApiUrl(path));
  } catch {
    throw new PortalBackendError("Could not reach the backend for the combined course detail.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new PortalBackendError(
      `Backend request failed for ${path} with ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

export async function loadUnifiedCourseDetail({
  url = "",
  title = "",
  term = "",
  iliasLimit = 8,
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
