import { useCallback, useEffect, useState } from "react";

import { fetchCampusSnapshot } from "./api";
import type { CampusSnapshot, KufOccupancyHistoryRecord, KufTrainingOccupancy } from "./campus-types";

const KUF_HISTORY_KEY = "tue.study-hub.kuf-occupancy-history.v1";
const RETENTION_DAYS = 90;

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
      const snapshot = await fetchCampusSnapshot(baseUrl);
      const fitnessHistory = snapshot.fitness ? recordKufSample(snapshot.fitness) : loadKufHistory();
      setData({ ...snapshot, fitnessHistory });
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

function recordKufSample(occupancy: KufTrainingOccupancy): KufOccupancyHistoryRecord[] {
  const recordedAt = new Date(occupancy.retrieved_at || Date.now());
  const hourStartedAt = startOfHour(recordedAt);
  const retentionStart = new Date(recordedAt);
  retentionStart.setDate(retentionStart.getDate() - RETENTION_DAYS);
  const nextRecord = {
    facility_name: occupancy.facility_name,
    count: occupancy.count,
    recorded_at: recordedAt.toISOString(),
    hour_started_at: hourStartedAt.toISOString()
  };
  const records = loadKufHistory()
    .filter((record) => new Date(record.hour_started_at) >= retentionStart)
    .filter((record) => record.hour_started_at !== nextRecord.hour_started_at);
  records.push(nextRecord);
  records.sort((left, right) => left.hour_started_at.localeCompare(right.hour_started_at));
  saveKufHistory(records);
  return records;
}

function loadKufHistory(): KufOccupancyHistoryRecord[] {
  try {
    const raw = window.localStorage.getItem(KUF_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as KufOccupancyHistoryRecord[];
    return parsed.filter(isHistoryRecord).sort((left, right) => left.hour_started_at.localeCompare(right.hour_started_at));
  } catch {
    return [];
  }
}

function saveKufHistory(records: KufOccupancyHistoryRecord[]) {
  window.localStorage.setItem(KUF_HISTORY_KEY, JSON.stringify(records));
}

function startOfHour(date: Date): Date {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  return next;
}

function isHistoryRecord(value: KufOccupancyHistoryRecord): value is KufOccupancyHistoryRecord {
  return typeof value?.count === "number" && typeof value.hour_started_at === "string";
}
