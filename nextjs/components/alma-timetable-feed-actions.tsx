"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LoaderCircle, RefreshCcw } from "lucide-react";

import { refreshAlmaTimetableExportUrl } from "../lib/portal-api";
import { CopyLinkButton } from "./copy-link-button";

export function AlmaTimetableFeedActions({
  initialUrl,
  termValue,
  canRefresh
}: {
  initialUrl: string;
  termValue: string;
  canRefresh: boolean;
}) {
  const [feedUrl, setFeedUrl] = useState(initialUrl);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);
    setError("");
    try {
      const refreshed = await refreshAlmaTimetableExportUrl(termValue);
      if (!refreshed.calendar_feed_url) {
        throw new Error("Alma returned no calendar feed URL.");
      }
      setFeedUrl(refreshed.calendar_feed_url);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "The feed URL could not be refreshed.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground break-all">{feedUrl}</p>
      <div className="flex flex-wrap gap-2">
        <CopyLinkButton value={feedUrl} label="Copy feed" />
        <Button variant="outline" size="sm" asChild>
          <a href={feedUrl}>Open feed</a>
        </Button>
        {canRefresh ? (
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
            Refresh feed
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
