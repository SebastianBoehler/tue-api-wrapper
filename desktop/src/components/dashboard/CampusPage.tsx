import { formatTimestamp } from "../../lib/format";
import { EmptyState, PanelHeader } from "./DashboardPrimitives";
import type { CampusPageProps } from "./types";

export function CampusPage({ campus, campusError, campusLoading, data, onRefreshCampus }: CampusPageProps) {
  return (
    <div className="content-grid">
      <article className="panel">
        <PanelHeader title="Talks" meta={data?.talks.available ? `${data.talks.totalHits} upcoming` : "Unavailable"} />
        {data?.talks.available ? (
          <div className="stack-list">
            {data.talks.items.map((talk) => (
              <button key={talk.id} className="link-row" onClick={() => void window.desktop.openExternal(talk.source_url)} type="button">
                <div>
                  <strong>{talk.title}</strong>
                  <span>{talk.speaker_name || talk.location || "Speaker pending"}</span>
                </div>
                <span>{formatTimestamp(talk.timestamp)}</span>
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
        {campus?.errors.map((error) => (
          <p key={error} className="inline-error">{error}</p>
        ))}
        <div className="stack-list">
          {campus?.fitness ? (
            <div className="stack-row compact-row">
              <div>
                <strong>{campus.fitness.facility_name}</strong>
                <span>Retrieved {formatTimestamp(campus.fitness.retrieved_at)}</span>
              </div>
              <span>{campus.fitness.count} people</span>
            </div>
          ) : null}
          {(campus?.events?.items ?? []).slice(0, 3).map((event) => (
            <button
              key={event.id}
              className="link-row"
              disabled={!event.url}
              onClick={() => event.url ? void window.desktop.openExternal(event.url) : undefined}
              type="button"
            >
              <div>
                <strong>{event.title}</strong>
                <span>{event.location || event.speaker || "University event"}</span>
              </div>
              <span>{formatTimestamp(event.starts_at)}</span>
            </button>
          ))}
          {campus && !campus.fitness && !campus.events?.items.length && !campus.canteens?.length ? (
            <EmptyState>No campus data returned by the public endpoints.</EmptyState>
          ) : null}
        </div>
      </article>

      <article className="panel wide-panel">
        <PanelHeader title="Mensa today" meta={`${campus?.canteens?.length ?? 0} canteens`} />
        <div className="stack-list">
          {(campus?.canteens ?? []).slice(0, 4).map((canteen) => (
            <div key={canteen.canteen_id} className="stack-row">
              <div>
                <strong>{canteen.canteen}</strong>
                <span>{canteen.address || "Address pending"}</span>
                {canteen.menus[0]?.items[0] ? <span>{canteen.menus[0].items[0]}</span> : null}
              </div>
              <span>{canteen.menus.length} menus</span>
            </div>
          ))}
          {campus?.canteens?.length === 0 ? <EmptyState>No canteen menus returned for today.</EmptyState> : null}
        </div>
      </article>
    </div>
  );
}
