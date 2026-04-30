import { useCallback, useEffect, useState } from "react";

import { fetchCampusSnapshot } from "./api";
import type { CampusSnapshot } from "./campus-types";

export function useCampusSnapshot(baseUrl: string | null, enabled: boolean) {
  const [data, setData] = useState<CampusSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!baseUrl || !enabled) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setData(await fetchCampusSnapshot(baseUrl));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load campus data.");
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
