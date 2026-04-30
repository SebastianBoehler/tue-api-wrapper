import { formatDateRange } from "../../lib/format";
import { EmptyState, PanelHeader } from "./DashboardPrimitives";
import type { DashboardPageProps } from "./types";

export function CalendarPage({ data, state }: DashboardPageProps) {
  return (
    <div className="page-grid">
      <section className="panel section-hero">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2>Upcoming Alma timetable</h2>
          <p className="muted">The desktop view uses the same live timetable contract as the backend and mobile app.</p>
        </div>
        {state.backendUrl && data?.agenda.exportUrl ? (
          <button
            className="secondary-button"
            onClick={() => void window.desktop.openExternal(data.agenda.exportUrl ?? "")}
            type="button"
          >
            Open calendar export
          </button>
        ) : null}
      </section>

      <article className="panel">
        <PanelHeader title="Schedule" meta={`${data?.agenda.items.length ?? 0} events`} />
        <div className="stack-list">
          {(data?.agenda.items ?? []).map((item) => (
            <div key={`${item.summary}-${item.start}`} className="stack-row">
              <div>
                <strong>{item.summary}</strong>
                <span>{item.location || "Location pending"}</span>
              </div>
              <time>{formatDateRange(item.start, item.end)}</time>
            </div>
          ))}
          {data?.agenda.items.length === 0 ? <EmptyState>No timetable events returned for this term.</EmptyState> : null}
        </div>
      </article>
    </div>
  );
}
