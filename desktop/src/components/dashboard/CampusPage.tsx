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

      <article className="panel">
        <div className="section-heading">
          <h3>Campus live</h3>
          <button className="ghost-button compact-button" disabled={campusLoading} onClick={onRefreshCampus} type="button">
            {campusLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
        {campusError ? <p className="inline-error">{campusError}</p> : null}
        {campus?.errors.map((error) => <p key={error} className="inline-error">{error}</p>)}
        <div className="aligned-list">
          {campus?.fitness ? (
            <div className="aligned-row">
              <div>
                <strong>{campus.fitness.facility_name}</strong>
                <span>Retrieved {formatTimestamp(campus.fitness.retrieved_at)}</span>
              </div>
              <time>{campus.fitness.count} people</time>
            </div>
          ) : null}
          {(campus?.seats?.locations ?? []).slice(0, 5).map((seat) => (
            <button
              key={seat.location_id}
              className="aligned-row"
              disabled={!seat.url}
              onClick={() => seat.url ? void window.desktop.openExternal(seat.url) : undefined}
              type="button"
            >
              <div>
                <strong>{seat.long_name || seat.name}</strong>
                <span>{seat.updated_at ? `Updated ${formatTimestamp(seat.updated_at)}` : "University Library seatfinder"}</span>
              </div>
              <time>{formatSeatCount(seat.free_seats, seat.total_seats)}</time>
            </button>
          ))}
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
          {campus && !campus.fitness && !campus.seats?.locations.length && !campus.events?.items.length && !campus.canteens?.length ? (
            <EmptyState>No campus data returned by the public endpoints.</EmptyState>
          ) : null}
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

function formatSeatCount(free?: number | null, total?: number | null): string {
  if (typeof free === "number" && typeof total === "number") {
    return `${free}/${total} free`;
  }
  if (typeof free === "number") {
    return `${free} free`;
  }
  return "Live status";
}
