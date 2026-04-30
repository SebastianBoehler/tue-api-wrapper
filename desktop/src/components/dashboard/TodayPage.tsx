import { formatCredits, formatDateRange, formatTimestamp } from "../../lib/format";
import { EmptyState, PanelHeader } from "./DashboardPrimitives";
import type { DashboardPageProps } from "./types";

export function TodayPage({ data }: DashboardPageProps) {
  return (
    <div className="page-grid">
      <section className="panel hero-strip">
        <div>
          <p className="eyebrow">Current term</p>
          <h2>{data?.termLabel ?? "Waiting for live data"}</h2>
          <p className="muted hero-note">Calendar, learning work, mail, and study status from the local backend.</p>
        </div>
        <div className="hero-meta">
          <span>{data ? `Updated ${formatTimestamp(data.generatedAt)}` : "Waiting for live data"}</span>
        </div>
      </section>

      <section className="metrics-grid">
        {(data?.metrics ?? []).map((metric) => (
          <article key={metric.label} className="panel metric-card">
            <p className="eyebrow">{metric.label}</p>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <PanelHeader title="Next events" meta={`${data?.agenda.items.length ?? 0} upcoming`} />
          <div className="stack-list">
            {(data?.agenda.items ?? []).slice(0, 4).map((item) => (
              <div key={`${item.summary}-${item.start}`} className="stack-row">
                <div>
                  <strong>{item.summary}</strong>
                  <span>{item.location || "Location pending"}</span>
                </div>
                <time>{formatDateRange(item.start, item.end)}</time>
              </div>
            ))}
            {data?.agenda.items.length === 0 ? <EmptyState>No upcoming events returned by Alma.</EmptyState> : null}
          </div>
        </article>

        <article className="panel">
          <PanelHeader title="Study snapshot" meta={formatCredits(data?.study.currentSemesterCredits)} />
          <div className="stack-list">
            <div className="stack-row compact-row">
              <div>
                <strong>Passed exams</strong>
                <span>{data?.study.selectedTerm ?? "No selected term"}</span>
              </div>
              <span>{data?.study.passedExamCount ?? 0}</span>
            </div>
            <div className="stack-row compact-row">
              <div>
                <strong>Open ILIAS tasks</strong>
                <span>{data?.ilias.title ?? "Learning platform"}</span>
              </div>
              <span>{data?.ilias.tasks.length ?? 0}</span>
            </div>
            <div className="stack-row compact-row">
              <div>
                <strong>Unread mail</strong>
                <span>{data?.mail.available ? "Mailbox preview loaded" : data?.mail.error || "Mail unavailable"}</span>
              </div>
              <span>{data?.mail.unreadCount ?? 0}</span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
