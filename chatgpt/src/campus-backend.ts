import type { CampusCanteen } from "./types.js";
import { buildPortalApiUrl, PortalBackendError } from "./backend.js";

export interface CampusFoodPlanParams {
  date?: string;
}

function buildCampusQueryString(params: CampusFoodPlanParams): string {
  const query = new URLSearchParams();
  if (params.date?.trim()) {
    query.set("date", params.date.trim());
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
}

async function fetchCampusJson<T>(path: string): Promise<T> {
  const url = buildPortalApiUrl(path);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new PortalBackendError(`Could not reach the backend at ${new URL(url).origin}.`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new PortalBackendError(
      `Backend request failed for ${path} with ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

export async function loadCampusFoodPlan(params: CampusFoodPlanParams = {}): Promise<CampusCanteen[]> {
  return fetchCampusJson<CampusCanteen[]>(
    `/api/campus/canteens${buildCampusQueryString(params)}`,
  );
}
