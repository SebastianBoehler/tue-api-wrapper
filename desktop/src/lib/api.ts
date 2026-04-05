import type { DashboardData } from "./dashboard-types";

export async function fetchDashboard(baseUrl: string): Promise<DashboardData> {
  const response = await fetch(`${baseUrl}/api/dashboard`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Dashboard request failed with ${response.status}.`);
  }

  return (await response.json()) as DashboardData;
}
