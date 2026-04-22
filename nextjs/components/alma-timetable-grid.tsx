import type { Route } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { buildAgendaCourseDetailHref } from "../lib/alma-course-detail";
import type { AlmaTimetableDay } from "../lib/discovery-types";
import { formatTimetableDateLabel, formatTimetableTimeLabel, getTimetableDateKey } from "../lib/alma-timetable-ui";
import type { AgendaItem } from "../lib/types";
import { cn } from "../lib/utils";

const HOUR_HEIGHT = 72;
const FALLBACK_EVENT_HEIGHT = 56;

interface TimetableEventLayout {
  item: AgendaItem;
  startMinutes: number;
  endMinutes: number;
  top: number;
  height: number;
  laneIndex: number;
  laneCount: number;
}

interface TimetableColumn {
  key: string;
  label: string;
  note: string | null;
  items: TimetableEventLayout[];
}

function getDayColumns(days: AlmaTimetableDay[], occurrences: AgendaItem[]) {
  if (days.length) {
    return days.map((day) => ({
      key: day.iso_date ?? day.label,
      label: day.iso_date ? formatTimetableDateLabel(day.iso_date) : day.label,
      note: day.note
    }));
  }

  return Array.from(
    new Map(
      occurrences.map((item) => [
        getTimetableDateKey(item.start),
        {
          key: getTimetableDateKey(item.start),
          label: formatTimetableDateLabel(item.start),
          note: null
        }
      ])
    ).values()
  );
}

function getMinutes(value: string) {
  const date = new Date(value);
  return (date.getHours() * 60) + date.getMinutes();
}

function getTimelineBounds(occurrences: AgendaItem[]) {
  const starts = occurrences.map((item) => getMinutes(item.start));
  const ends = occurrences.map((item) => item.end ? getMinutes(item.end) : getMinutes(item.start));
  const startMinutes = Math.floor(Math.min(...starts) / 60) * 60;
  const endMinutes = Math.max(Math.ceil(Math.max(...ends) / 60) * 60, startMinutes + 60);

  return { startMinutes, endMinutes };
}

function layoutDayItems(items: AgendaItem[], timelineStartMinutes: number) {
  const scheduled = items
    .map((item) => {
      const startMinutes = getMinutes(item.start);
      const endMinutes = item.end ? getMinutes(item.end) : startMinutes;

      return {
        item,
        startMinutes,
        endMinutes: Math.max(endMinutes, startMinutes)
      };
    })
    .sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);

  const laidOut: TimetableEventLayout[] = [];
  let active: TimetableEventLayout[] = [];
  let cluster: TimetableEventLayout[] = [];
  let clusterLaneCount = 1;

  function flushCluster() {
    for (const entry of cluster) {
      entry.laneCount = clusterLaneCount;
      laidOut.push(entry);
    }

    active = [];
    cluster = [];
    clusterLaneCount = 1;
  }

  for (const scheduledItem of scheduled) {
    active = active.filter((entry) => entry.endMinutes > scheduledItem.startMinutes);

    if (!active.length && cluster.length) {
      flushCluster();
    }

    const occupiedLanes = new Set(active.map((entry) => entry.laneIndex));
    let laneIndex = 0;
    while (occupiedLanes.has(laneIndex)) {
      laneIndex += 1;
    }

    const durationHeight = ((scheduledItem.endMinutes - scheduledItem.startMinutes) / 60) * HOUR_HEIGHT;
    const height = durationHeight > 0 ? durationHeight : FALLBACK_EVENT_HEIGHT;

    const entry: TimetableEventLayout = {
      item: scheduledItem.item,
      startMinutes: scheduledItem.startMinutes,
      endMinutes: scheduledItem.endMinutes,
      top: ((scheduledItem.startMinutes - timelineStartMinutes) / 60) * HOUR_HEIGHT,
      height,
      laneIndex,
      laneCount: 1
    };

    active.push(entry);
    cluster.push(entry);
    clusterLaneCount = Math.max(clusterLaneCount, active.length);
  }

  if (cluster.length) {
    flushCluster();
  }

  return laidOut;
}

function getHourMarkers(startMinutes: number, endMinutes: number) {
  const totalHours = Math.max((endMinutes - startMinutes) / 60, 1);
  return Array.from({ length: totalHours + 1 }, (_, index) => startMinutes + (index * 60));
}

function getHourLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:00`;
}

function getEventTimeLabel(item: AgendaItem) {
  const startLabel = formatTimetableTimeLabel(item.start);
  const endLabel = item.end ? formatTimetableTimeLabel(item.end) : null;
  return endLabel ? `${startLabel} - ${endLabel}` : startLabel;
}

const eventToneClasses = [
  "border-[#99d7d3] bg-[#e7f7f7] hover:bg-[#dbf1ef]",
  "border-[#f0c4d0] bg-[#fbeef2] hover:bg-[#f8e4ea]",
  "border-[#c8d9f6] bg-[#eef4fe] hover:bg-[#e5eefc]",
  "border-[#d7d4ae] bg-[#f7f4e5] hover:bg-[#f2eedb]",
  "border-[#d3c8ef] bg-[#f3effc] hover:bg-[#ede7f8]",
  "border-[#d1e2c4] bg-[#eef6e8] hover:bg-[#e5f0dc]",
];

function getEventTone(summary: string) {
  const seed = Array.from(summary).reduce((total, character) => total + character.charCodeAt(0), 0);
  return eventToneClasses[seed % eventToneClasses.length];
}

export function AlmaTimetableGrid({
  days,
  occurrences,
  selectedTermValue
}: {
  days: AlmaTimetableDay[];
  occurrences: AgendaItem[];
  selectedTermValue: string | null;
}) {
  if (!occurrences.length) {
    return <p className="text-sm text-muted-foreground">No Alma timetable items matched the selected filters.</p>;
  }

  const columns = getDayColumns(days, occurrences);
  const { startMinutes, endMinutes } = getTimelineBounds(occurrences);
  const hourMarkers = getHourMarkers(startMinutes, endMinutes);
  const timelineHeight = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
  const gridTemplateColumns = `4.5rem repeat(${columns.length}, minmax(10rem, 1fr))`;

  const itemsByDay = new Map<string, AgendaItem[]>();
  for (const item of occurrences) {
    const dayKey = getTimetableDateKey(item.start);
    const dayItems = itemsByDay.get(dayKey) ?? [];
    dayItems.push(item);
    itemsByDay.set(dayKey, dayItems);
  }

  const timetableColumns: TimetableColumn[] = columns.map((column) => ({
    ...column,
    items: layoutDayItems(itemsByDay.get(column.key) ?? [], startMinutes)
  }));

  return (
    <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-muted/15">
      <div className="overflow-x-auto">
        <div className="min-w-[58rem]">
          <div className="grid border-b border-border/70 bg-background/90" style={{ gridTemplateColumns }}>
            <div className="border-r border-border/70 px-4 py-3" />
            {timetableColumns.map((column) => (
              <div key={column.key} className="border-r border-border/70 px-4 py-3 last:border-r-0">
                <p className="text-sm font-medium">{column.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{column.note ?? "Scheduled blocks"}</p>
              </div>
            ))}
          </div>

          <div className="grid bg-background/80" style={{ gridTemplateColumns }}>
            <div className="relative border-r border-border/70 bg-background/60" style={{ height: timelineHeight }}>
              {hourMarkers.map((marker) => (
                <div
                  key={marker}
                  className="absolute inset-x-0 border-t border-dashed border-border/60"
                  style={{ top: ((marker - startMinutes) / 60) * HOUR_HEIGHT }}
                >
                  <span className="-translate-y-1/2 absolute left-3 top-0 rounded-full bg-background px-2 text-[11px] font-medium text-muted-foreground">
                    {getHourLabel(marker)}
                  </span>
                </div>
              ))}
            </div>

            {timetableColumns.map((column) => (
              <div key={column.key} className="relative border-r border-border/70 bg-background/30 last:border-r-0" style={{ height: timelineHeight }}>
                {hourMarkers.map((marker) => (
                  <div
                    key={`${column.key}-${marker}`}
                    className="absolute inset-x-0 border-t border-dashed border-border/60"
                    style={{ top: ((marker - startMinutes) / 60) * HOUR_HEIGHT }}
                  />
                ))}

                {column.items.map((entry) => {
                  const laneWidth = 100 / entry.laneCount;
                  const style = {
                    top: entry.top,
                    height: entry.height,
                    left: `calc(${entry.laneIndex * laneWidth}% + 0.25rem)`,
                    width: `calc(${laneWidth}% - 0.5rem)`
                  };

                  return (
                    <Link
                      key={`${entry.item.summary}-${entry.item.start}`}
                      href={buildAgendaCourseDetailHref(entry.item, selectedTermValue) as Route}
                      className={cn(
                        "absolute flex flex-col gap-1.5 rounded-[1.6rem] border px-3 py-2.5 text-left ring-1 ring-black/3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        getEventTone(entry.item.summary)
                      )}
                      style={style}
                      title={`Open details for ${entry.item.summary}`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/75">
                        {getEventTimeLabel(entry.item)}
                      </p>
                      <p className="text-sm font-medium leading-tight text-foreground">
                        {entry.item.summary}
                      </p>
                      {entry.item.location ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {entry.item.location}
                        </p>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border/70 bg-background/70 px-5 py-3 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" />
        Blocks are positioned by Alma start and end times. Overlaps stay visible side by side.
      </div>
    </div>
  );
}
