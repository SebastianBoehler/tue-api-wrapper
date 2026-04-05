import { useCallback, useEffect, useState } from "react";

import { fetchDashboard } from "./api";
import type { DashboardData } from "./dashboard-types";

export function useDashboard(baseUrl: string | null, enabled: boolean) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!baseUrl || !enabled) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setData(await fetchDashboard(baseUrl));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh
  };
}
