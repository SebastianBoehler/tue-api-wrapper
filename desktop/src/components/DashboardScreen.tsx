import type { DesktopRuntimeState } from "../../shared/desktop-types";
import type { DashboardData } from "../lib/dashboard-types";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time pending";
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatDateRange(start: string, end?: string | null): string {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return "Time pending";
  }

  const formatter = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  if (!end) {
    return formatter.format(startDate);
  }

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) {
    return formatter.format(startDate);
  }

  return `${formatter.format(startDate)} – ${new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(endDate)}`;
}

function formatCredits(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Unavailable";
  }
  return `${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, "")} CP`;
}

export function DashboardScreen({
  state,
  data,
  loading,
  error,
  onRefresh,
  onRestart,
  onClearCredentials
}: {
  state: DesktopRuntimeState;
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onRestart: () => Promise<void>;
  onClearCredentials: () => Promise<void>;
}) {
  const studyNote = data?.study.currentSemesterCreditError
    ?? (data?.study.currentSemesterCreditUnresolved?.length
      ? `${data.study.currentSemesterCreditUnresolved.length} visible timetable entries still have no CP value.`
      : "Live Alma values are reflected in the saved semester total.");

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Study hub desktop</p>
          <h1>{data?.hero.title ?? "Study Hub"}</h1>
          <p className="lead">{data?.hero.subtitle ?? "Your local desktop shell for the Tuebingen study tooling."}</p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={onRefresh} disabled={loading || !state.backendUrl}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="secondary-button" onClick={() => void onRestart()}>
            Restart backend
          </button>
          <button className="ghost-button" onClick={() => void onClearCredentials()}>
            Forget credentials
          </button>
        </div>
      </header>

      <section className="panel hero-strip">
        <div>
          <p className="eyebrow">Current term</p>
          <h2>{data?.termLabel ?? "Waiting for live data"}</h2>
          <p className="muted hero-note">Keep the most important study surfaces visible without opening the browser tools first.</p>
        </div>
        <div className="hero-meta">
          <span>{state.username ? `Signed in as ${state.username}` : "No user stored"}</span>
          <span>{data ? `Updated ${formatTimestamp(data.generatedAt)}` : "Waiting for live data"}</span>
        </div>
      </section>

      {error ? <div className="panel error-panel">{error}</div> : null}

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
          <div className="section-heading">
            <h3>Upcoming events</h3>
            <span>{data?.agenda.items.length ?? 0} upcoming</span>
          </div>
          <div className="stack-list">
            {(data?.agenda.items ?? []).slice(0, 6).map((item) => (
              <div key={`${item.summary}-${item.start}`} className="stack-row">
                <div>
                  <strong>{item.summary}</strong>
                  <span>{item.location || "Location pending"}</span>
                </div>
                <time>{formatDateRange(item.start, item.end)}</time>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <h3>ILIAS tasks</h3>
            <span>{data?.ilias.tasks.length ?? 0} visible</span>
          </div>
          <div className="stack-list">
            {(data?.ilias.tasks ?? []).slice(0, 6).map((task) => (
              <button key={`${task.title}-${task.url}`} className="link-row" onClick={() => void window.desktop.openExternal(task.url)}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.item_type || "ILIAS item"}</span>
                </div>
                <span>{task.end ? `Due ${task.end}` : "Open"}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <h3>Learning spaces</h3>
            <span>{data?.ilias.memberships.length ?? 0} visible</span>
          </div>
          <div className="stack-list">
            {(data?.ilias.memberships ?? []).slice(0, 6).map((space) => (
              <button key={`${space.title}-${space.url}`} className="link-row" onClick={() => void window.desktop.openExternal(space.url)}>
                <div>
                  <strong>{space.title}</strong>
                  <span>{space.description || space.properties[0] || "Open learning space"}</span>
                </div>
                <span>{space.kind || "Space"}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <h3>Study progress</h3>
            <span>{data?.study.passedExamCount ?? 0} passed</span>
          </div>
          <div className="stack-list">
            <div className="stack-row compact-row">
              <div>
                <strong>Saved semester credits</strong>
                <span>{studyNote}</span>
              </div>
              <span>{formatCredits(data?.study.currentSemesterCredits)}</span>
            </div>
            <div className="stack-row compact-row">
              <div>
                <strong>Tracked credits</strong>
                <span>{data?.study.selectedTerm ?? "No selected term"}</span>
              </div>
              <span>{data?.study.trackedCredits ?? 0} CP</span>
            </div>
            {(data?.exams ?? []).slice(0, 5).map((exam) => (
              <div key={`${exam.number}-${exam.title}`} className="stack-row compact-row">
                <div>
                  <strong>{exam.title}</strong>
                  <span>{exam.number || exam.status || "No structured label available"}</span>
                </div>
                <span>{exam.grade || exam.status || "Pending"}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <h3>Mail preview</h3>
            <span>{data?.mail.unreadCount ?? 0} unread</span>
          </div>
          {data?.mail.available ? (
            <div className="stack-list">
              {(data.mail.items ?? []).slice(0, 6).map((item) => (
                <div key={item.uid} className="stack-row compact-row">
                  <div>
                    <strong>{item.subject}</strong>
                    <span>{item.from_name || item.from_address || "Unknown sender"}</span>
                    {item.preview ? <span>{item.preview}</span> : null}
                  </div>
                  <span>{item.is_unread ? "Unread" : "Read"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">{data?.mail.error || "Mail preview unavailable."}</p>
          )}
        </article>

        <article className="panel">
          <div className="section-heading">
            <h3>Talks</h3>
            <span>{data?.talks.available ? `${data.talks.totalHits} upcoming` : "Unavailable"}</span>
          </div>
          {data?.talks.available ? (
            <div className="stack-list">
              {data.talks.items.slice(0, 6).map((talk) => (
                <button
                  key={talk.id}
                  className="link-row"
                  onClick={() => void window.desktop.openExternal(talk.source_url)}
                >
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
            <h3>Documents and tools</h3>
            <span>{data?.documents.reports.length ?? 0} report jobs</span>
          </div>
          <div className="action-list">
            {state.backendUrl ? (
              <>
                <button className="secondary-button full-width" onClick={() => void window.desktop.openExternal(`${state.backendUrl}/docs`)}>
                  Open backend API docs
                </button>
                {data?.documents.currentDownloadUrl ? (
                  <button
                    className="secondary-button full-width"
                    onClick={() => void window.desktop.openExternal(`${state.backendUrl}${data.documents.currentDownloadUrl}`)}
                  >
                    Open current Alma PDF
                  </button>
                ) : null}
              </>
            ) : null}
            {(data?.documents.reports ?? []).slice(0, 6).map((report) => (
              <div key={report.trigger_name} className="stack-row compact-row">
                <div>
                  <strong>{report.label}</strong>
                  <span>{report.trigger_name}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
