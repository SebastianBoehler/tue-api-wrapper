import type { KufOccupancyHistoryRecord, KufTrainingOccupancy, SeatAvailabilityResponse, SeatLocationStatus } from "../../lib/campus-types";
import { formatTimestamp } from "../../lib/format";
import { EmptyState, PanelHeader } from "./DashboardPrimitives";
import type { CampusPageProps } from "./types";

export function CampusPage({ campus, campusError, campusLoading, data, onRefreshCampus }: CampusPageProps) {
  return (
    <div className="content-grid">
      <article className="panel">
        <PanelHeader title="Talks" meta={data?.talks.available ? `${data.talks.totalHits} upcoming` : "Unavailable"} />
        {data?.talks.available ? (
          <div className="aligned-list">
            {data.talks.items.map((talk) => (
              <button key={talk.id} className="aligned-row" onClick={() => void window.desktop.openExternal(talk.source_url)} type="button">
                <div>
                  <strong>{talk.title}</strong>
                  <span>{talk.speaker_name || talk.location || "Speaker pending"}</span>
                </div>
                <time>{formatTimestamp(talk.timestamp)}</time>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">{data?.talks.error || "Talks preview unavailable."}</p>
        )}
      </article>

      <article className="panel campus-live-panel">
        <div className="section-heading">
          <h3>Campus live</h3>
          <button className="ghost-button compact-button" disabled={campusLoading} onClick={onRefreshCampus} type="button">
            {campusLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
        {campusError ? <p className="inline-error">{campusError}</p> : null}
        {campus?.errors.map((error) => <p key={error} className="inline-error">{error}</p>)}
        <div className="campus-live-grid">
          <KufPanel fitness={campus?.fitness ?? null} history={campus?.fitnessHistory ?? []} />
          <SeatPanel seats={campus?.seats ?? null} />
        </div>
      </article>

      <article className="panel">
        <PanelHeader title="Campus events" meta={`${campus?.events?.returned_hits ?? 0} shown`} />
        <div className="aligned-list">
          {(campus?.events?.items ?? []).slice(0, 4).map((event) => (
            <button
              key={event.id}
              className="aligned-row"
              disabled={!event.url}
              onClick={() => event.url ? void window.desktop.openExternal(event.url) : undefined}
              type="button"
            >
              <div>
                <strong>{event.title}</strong>
                <span>{event.location || event.speaker || "University event"}</span>
              </div>
              <time>{formatTimestamp(event.starts_at)}</time>
            </button>
          ))}
          {campus?.events?.items.length === 0 ? <EmptyState>No public events returned.</EmptyState> : null}
        </div>
      </article>

      <article className="panel wide-panel">
        <PanelHeader title="Mensa today" meta={`${campus?.canteens?.length ?? 0} canteens`} />
        <div className="mensa-grid">
          {(campus?.canteens ?? []).slice(0, 4).map((canteen) => (
            <section key={canteen.canteen_id} className="mensa-card">
              <div>
                <strong>{canteen.canteen}</strong>
                <span>{canteen.address || "Address pending"}</span>
              </div>
              <div className="mensa-menu-list">
                {canteen.menus.slice(0, 6).map((menu) => (
                  <div key={menu.id} className="mensa-menu-row">
                    <span>{menu.items.slice(0, 2).join(", ") || menu.menu_line || "Menu item"}</span>
                    <strong>{menu.student_price || "Price pending"}</strong>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {campus?.canteens?.length === 0 ? <EmptyState>No canteen menus returned for today.</EmptyState> : null}
        </div>
      </article>
    </div>
  );
}

function KufPanel({ fitness, history }: { fitness: KufTrainingOccupancy | null; history: KufOccupancyHistoryRecord[] }) {
  const hourly = aggregateKuf(history, "hour").slice(0, 8);
  const weekdays = aggregateKuf(history, "weekday");
  const max = Math.max(...hourly.map((item) => item.average), ...weekdays.map((item) => item.average), fitness?.count ?? 0, 1);
  return (
    <section className="campus-live-card">
      <div className="campus-live-card-header">
        <div>
          <span className="source-pill">KuF</span>
          <h4>{fitness?.facility_name ?? "Training occupancy"}</h4>
        </div>
        <strong>{fitness ? `${fitness.count}` : "—"}</strong>
      </div>
      <p className="muted">{fitness ? `Current headcount · ${formatTimestamp(fitness.retrieved_at)}` : "Current headcount unavailable."}</p>
      <MiniBars title="By hour" points={hourly} max={max} />
      <MiniBars title="By weekday" points={weekdays} max={max} />
      <p className="form-note">{history.length ? `${history.length} local hourly samples.` : "Refresh campus live to start local trend history."}</p>
    </section>
  );
}

function SeatPanel({ seats }: { seats: SeatAvailabilityResponse | null }) {
  const locations = seats?.locations ?? [];
  const summary = seatSummary(locations);
  return (
    <section className="campus-live-card">
      <div className="campus-live-card-header">
        <div>
          <span className="source-pill">Library seats</span>
          <h4>Room capacity</h4>
        </div>
        <strong>{summary.label}</strong>
      </div>
      <p className="muted">{seatUpdatedLabel(seats)}</p>
      <div className="seat-status-list">
        {locations.slice(0, 7).map((seat) => (
          <button
            key={seat.location_id}
            className="seat-status-row"
            disabled={!seat.url}
            onClick={() => seat.url ? void window.desktop.openExternal(seat.url) : undefined}
            type="button"
          >
            <span>{seat.long_name || seat.name}</span>
            <strong>{formatSeatCount(seat.free_seats, seat.total_seats)}</strong>
          </button>
        ))}
        {!locations.length ? <EmptyState>No library seat data returned.</EmptyState> : null}
      </div>
    </section>
  );
}

function MiniBars({ max, points, title }: { max: number; points: TrendPoint[]; title: string }) {
  return (
    <div className="campus-trend">
      <strong>{title}</strong>
      <div className="campus-trend-bars">
        {points.length ? points.map((point) => (
          <div key={point.label} className="campus-trend-bar">
            <span style={{ height: `${Math.max(8, (point.average / max) * 100)}%` }} />
            <small>{point.label}</small>
          </div>
        )) : <span className="muted">No samples yet.</span>}
      </div>
    </div>
  );
}

interface TrendPoint {
  label: string;
  average: number;
}

function aggregateKuf(records: KufOccupancyHistoryRecord[], scope: "hour" | "weekday"): TrendPoint[] {
  const buckets = new Map<number, number[]>();
  records.forEach((record) => {
    const date = new Date(record.hour_started_at);
    const key = scope === "hour" ? date.getHours() : date.getDay();
    buckets.set(key, [...(buckets.get(key) ?? []), record.count]);
  });
  const order = scope === "hour" ? Array.from({ length: 24 }, (_, index) => index) : [1, 2, 3, 4, 5, 6, 0];
  return order.flatMap((key) => {
    const values = buckets.get(key);
    if (!values?.length) return [];
    return [{ label: scope === "hour" ? String(key).padStart(2, "0") : weekdayLabel(key), average: average(values) }];
  });
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weekdayLabel(day: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day] ?? String(day);
}

function seatSummary(locations: SeatLocationStatus[]) {
  const free = sumKnown(locations.map((seat) => seat.free_seats));
  const total = sumKnown(locations.map((seat) => seat.total_seats));
  return { label: typeof free === "number" && typeof total === "number" ? `${free}/${total}` : `${locations.length} areas` };
}

function sumKnown(values: Array<number | null | undefined>): number | null {
  const known = values.filter((value): value is number => typeof value === "number");
  return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
}

function seatUpdatedLabel(seats: SeatAvailabilityResponse | null): string {
  const updated = seats?.locations.find((seat) => seat.updated_at)?.updated_at ?? seats?.retrieved_at;
  return updated ? `Updated ${formatTimestamp(updated)}` : "University Library seatfinder";
}

function formatSeatCount(free?: number | null, total?: number | null): string {
  if (typeof free === "number" && typeof total === "number") return `${free}/${total} free`;
  if (typeof free === "number") return `${free} free`;
  return "Live status";
}
