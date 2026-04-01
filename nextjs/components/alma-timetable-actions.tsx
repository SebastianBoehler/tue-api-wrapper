"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";
import { Download, ExternalLink, LoaderCircle, Printer, RefreshCcw } from "lucide-react";

import { refreshAlmaTimetableExportUrl } from "../lib/portal-api";

export function AlmaTimetableActions({
  almaUrl,
  initialFeedUrl,
  termValue,
  canRefreshFeed,
  supportsPdf,
  pdfUrl
}: {
  almaUrl: string;
  initialFeedUrl: string | null;
  termValue: string;
  canRefreshFeed: boolean;
  supportsPdf: boolean;
  pdfUrl: string | null;
}) {
  const [feedUrl, setFeedUrl] = useState(initialFeedUrl);
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
    <div className="flex max-w-full flex-wrap justify-end gap-2">
      {feedUrl ? (
        <a
          href={feedUrl}
          download
          className={cn(buttonVariants({ variant: "outline", size: "xs" }), "whitespace-nowrap")}
        >
          <Download data-icon="inline-start" />
          ICS export
        </a>
      ) : null}

      {canRefreshFeed ? (
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="whitespace-nowrap"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <RefreshCcw data-icon="inline-start" />}
          Refresh feed
        </Button>
      ) : null}

      {supportsPdf ? (
        pdfUrl ? (
          <a
            href={pdfUrl}
            className={cn(buttonVariants({ variant: "outline", size: "xs" }), "whitespace-nowrap")}
          >
            <Printer data-icon="inline-start" />
            PDF
          </a>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="whitespace-nowrap"
            disabled
            title="PDF export is unavailable for custom date ranges."
          >
            <Printer data-icon="inline-start" />
            PDF
          </Button>
        )
      ) : null}

      <a
        href={almaUrl}
        className={cn(buttonVariants({ variant: "outline", size: "xs" }), "whitespace-nowrap")}
      >
        <ExternalLink data-icon="inline-start" />
        Alma
      </a>

      {error ? <p className="basis-full text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
