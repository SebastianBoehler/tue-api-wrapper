"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";
import { BellRing, ExternalLink, LoaderCircle, RefreshCcw, Rss } from "lucide-react";

import type { AlmaPortalMessagesFeed } from "../lib/discovery-types";

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The Alma notifications feed could not be loaded.";
}

async function fetchFeed(apiBaseUrl: string, path: string, init?: RequestInit): Promise<AlmaPortalMessagesFeed> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
    ...init
  });

  if (!response.ok) {
    throw new Error(`Alma notifications feed returned ${response.status}.`);
  }

  return (await response.json()) as AlmaPortalMessagesFeed;
}

export function DashboardNotificationsFeedCard({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [feed, setFeed] = useState<AlmaPortalMessagesFeed | null>(null);
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadFeed() {
      try {
        const result = await fetchFeed(apiBaseUrl, "/api/alma/portal-messages/feed");
        if (isCancelled) {
          return;
        }
        setFeed(result);
        setError("");
      } catch (loadError) {
        if (!isCancelled) {
          setError(toMessage(loadError));
        }
      } finally {
        if (!isCancelled) {
          setHasLoaded(true);
        }
      }
    }

    void loadFeed();
    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const refreshed = await fetchFeed(apiBaseUrl, "/api/alma/portal-messages/feed/refresh", {
        method: "POST"
      });
      setFeed(refreshed);
      setError("");
    } catch (refreshError) {
      setError(toMessage(refreshError));
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-4 text-primary" />
          Notifications feed
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Subscribe to Alma portal notifications in an RSS reader and renew the token here when Alma rotates it.
        </p>

        <div className="flex flex-wrap gap-2">
          {feed?.feed_url ? (
            <a
              href={feed.feed_url}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "xs" }), "whitespace-nowrap")}
            >
              <Rss data-icon="inline-start" />
              RSS export
            </a>
          ) : null}

          {feed?.can_refresh_feed ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="whitespace-nowrap"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <LoaderCircle data-icon="inline-start" className="animate-spin" />
              ) : (
                <RefreshCcw data-icon="inline-start" />
              )}
              Refresh feed
            </Button>
          ) : null}

          {feed?.page_url ? (
            <a
              href={feed.page_url}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "xs" }), "whitespace-nowrap")}
            >
              <ExternalLink data-icon="inline-start" />
              Alma
            </a>
          ) : null}
        </div>

        {!hasLoaded ? <p className="text-xs text-muted-foreground">Loading Alma notifications feed…</p> : null}
        {hasLoaded && !error && !feed?.feed_url ? (
          <p className="text-xs text-muted-foreground">Alma did not expose a notifications feed in the current view.</p>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
