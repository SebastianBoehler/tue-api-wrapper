"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import type { CampusBuildingSummary } from "../lib/product-types";

function buildCampusHref(options: { canteenId?: string; buildingPath?: string }) {
  const params = new URLSearchParams();
  if (options.canteenId) {
    params.set("canteenId", options.canteenId);
  }
  if (options.buildingPath) {
    params.set("buildingPath", options.buildingPath);
  }
  return `/campus?${params.toString()}`;
}

export function CampusBuildingExplorer({
  buildings,
  selectedPath,
  currentCanteenId
}: {
  buildings: CampusBuildingSummary[];
  selectedPath: string | null;
  currentCanteenId: string;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filteredBuildings = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) {
      return buildings;
    }
    return buildings.filter((building) => building.title.toLowerCase().includes(needle));
  }, [buildings, deferredQuery]);

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="building-query" className="text-xs uppercase tracking-wide text-muted-foreground">
          Filter buildings
        </label>
        <Input
          id="building-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Morgenstelle, Kupferbau, Wilhelmstraße…"
        />
      </div>
      <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
        {filteredBuildings.map((building) => (
          <Link
            key={building.path}
            href={buildCampusHref({ canteenId: currentCanteenId, buildingPath: building.path }) as Route}
            className={`block rounded-2xl px-3 py-2 text-sm transition-colors hover:bg-muted/40 ${selectedPath === building.path ? "bg-primary/5 text-primary" : "text-foreground"
              }`}
          >
            <p className="font-medium">{building.title}</p>
            {building.area_label ? <p className="text-xs text-muted-foreground">{building.area_label}</p> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
