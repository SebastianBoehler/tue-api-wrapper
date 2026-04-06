"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTimmsSuggestions } from "../lib/product-api";

export function TimmsSearchBox({
  action,
  defaultQuery,
  nodeId,
  nodePath
}: {
  action: string;
  defaultQuery: string;
  nodeId?: string;
  nodePath?: string;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (deferredQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let active = true;
    startTransition(async () => {
      try {
        const items = await getTimmsSuggestions(deferredQuery, 6);
        if (active) {
          setSuggestions(items);
        }
      } catch {
        if (active) {
          setSuggestions([]);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [deferredQuery]);

  return (
    <form action={action} method="get" className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <div className="min-w-0 flex-1">
        <label htmlFor="timms-query" className="text-xs uppercase tracking-wide text-muted-foreground">
          Search TIMMS
        </label>
        <Input
          id="timms-query"
          name="query"
          list="timms-suggestions"
          placeholder="Informatik II, computer vision, Hendrik Lensch…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <datalist id="timms-suggestions">
          {suggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>
      {nodeId ? <input type="hidden" name="nodeId" value={nodeId} /> : null}
      {nodePath ? <input type="hidden" name="nodePath" value={nodePath} /> : null}
      <Button type="submit">
        <Search className="size-4" />
        {isPending ? "Suggesting…" : "Search"}
      </Button>
    </form>
  );
}
