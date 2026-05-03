import { useCallback, useEffect, useState } from "react";

import { fetchCourseDiscoveryStatus, searchCourseDiscovery } from "./api";
import type { CourseDiscoverySearchResponse, CourseDiscoveryStatus } from "./course-discovery-types";

export function useCourseDiscovery(baseUrl: string | null, enabled: boolean) {
  const [query, setQuery] = useState("machine learning");
  const [sources, setSources] = useState<string[]>(["alma"]);
  const [includePrivate, setIncludePrivate] = useState(false);
  const [response, setResponse] = useState<CourseDiscoverySearchResponse | null>(null);
  const [status, setStatus] = useState<CourseDiscoveryStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!baseUrl || !enabled) {
      return;
    }
    try {
      setStatus(await fetchCourseDiscoveryStatus(baseUrl));
    } catch {
      setStatus(null);
    }
  }, [baseUrl, enabled]);

  const search = useCallback(async () => {
    if (!baseUrl || !enabled || !query.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await searchCourseDiscovery(baseUrl, {
        query: query.trim(),
        sources,
        includePrivate
      });
      setResponse(next);
      setStatus(next.status);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not search course discovery.");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, enabled, includePrivate, query, sources]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  return {
    error,
    includePrivate,
    loading,
    query,
    response,
    search,
    setIncludePrivate,
    setQuery,
    setSources,
    sources,
    status
  };
}
