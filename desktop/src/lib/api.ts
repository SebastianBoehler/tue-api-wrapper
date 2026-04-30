import type { DashboardData } from "./dashboard-types";
import type { CampusCanteen, CampusSnapshot, KufTrainingOccupancy, UniversityCalendarResponse } from "./campus-types";

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

async function fetchJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

function errorMessage(scope: string, error: unknown): string {
  return `${scope}: ${error instanceof Error ? error.message : "Request failed."}`;
}
