import { useCallback, useEffect, useRef, useState } from "react";

import { applyCourseAssignments, fetchCourseAssignments, fetchDashboard, markCourseAssignmentsError } from "./api";
import type { DashboardData } from "./dashboard-types";

export function useDashboard(baseUrl: string | null, enabled: boolean) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!baseUrl || !enabled) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const dashboard = await fetchDashboard(baseUrl, { includeCourseAssignments: false });
      if (requestId !== requestIdRef.current) {
        return;
      }

      setData(dashboard);
      setLoading(false);
      void fetchCourseAssignments(baseUrl, dashboard.termLabel)
        .then((assignments) => {
          if (requestId !== requestIdRef.current) {
            return;
          }
          setData((current) => current ? applyCourseAssignments(current, assignments) : current);
        })
        .catch((caughtError) => {
          if (requestId !== requestIdRef.current) {
            return;
          }
          setData((current) => current ? markCourseAssignmentsError(current, caughtError) : current);
        });
    } catch (caughtError) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setError(caughtError instanceof Error ? caughtError.message : "Could not load the dashboard.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
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
