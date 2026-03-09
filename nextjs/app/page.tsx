import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { ErrorPanel } from "../components/error-panel";
import { buildPortalApiUrl, getDashboard, PortalApiError } from "../lib/portal-api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function HomePage() {
  try {
    const dashboard = await getDashboard();

    return (
      <AppShell title="Overview" kicker="Live dashboard">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Semester {dashboard.termLabel}</p>
            <h2>{dashboard.hero.title}</h2>
            <p className="hero-copy">{dashboard.hero.subtitle}</p>
          </div>
          <div className="hero-actions">
            <Link href="/agenda" className="action-link">
              Open agenda
            </Link>
            <Link href="/assistant" className="action-link ghost">
              Use ChatGPT app
            </Link>
          </div>
        </section>

        <section className="metric-grid">
          {dashboard.metrics.map((metric) => (
            <article key={metric.label} className="metric-card">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Agenda</p>
                <h3>Upcoming blocks</h3>
              </div>
              <a href={dashboard.agenda.exportUrl} className="inline-link">
                Alma export
              </a>
            </div>
            <div className="stack">
              {dashboard.agenda.items.map((item) => (
                <div key={`${item.summary}-${item.start}`} className="list-row">
                  <div>
                    <strong>{item.summary}</strong>
                    <p>{item.location ?? "Location pending"}</p>
                  </div>
                  <time>{formatDate(item.start)}</time>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Paperwork</p>
                <h3>Study-service documents</h3>
              </div>
              <Link href="/documents" className="inline-link">
                See all
              </Link>
            </div>
            {dashboard.documents.currentDownloadUrl ? (
              <div className="download-callout">
                <strong>Current PDF available</strong>
                <a href={buildPortalApiUrl(dashboard.documents.currentDownloadUrl)} className="inline-link">
                  Download current document
                </a>
              </div>
            ) : null}
            <div className="stack">
              {dashboard.documents.reports.map((document) => (
                <div key={document.trigger_name} className="list-row compact">
                  <strong>{document.label}</strong>
                  <span>{document.trigger_name}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Exams</p>
                <h3>Progress snapshot</h3>
              </div>
            </div>
            <div className="stack">
              {dashboard.exams.map((exam) => (
                <div key={`${exam.number}-${exam.title}`} className="list-row compact">
                  <div>
                    <strong>{exam.title}</strong>
                    <p>{exam.number ?? "Unnumbered item"}</p>
                  </div>
                  <span>{exam.grade ?? exam.status ?? "-"}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Course discovery</p>
                <h3>Alma catalog preview</h3>
              </div>
              <Link href="/courses" className="inline-link">
                Browse catalog
              </Link>
            </div>
            <div className="stack">
              {dashboard.catalog.nodes.map((node) => (
                <Link
                  key={`${node.level}-${node.title}`}
                  className="list-row compact"
                  href="/courses"
                >
                  <div>
                    <strong>{node.title}</strong>
                    <p>{node.description ?? node.kind ?? "Open the course discovery view for live filtering"}</p>
                  </div>
                  <span>L{node.level}</span>
                </Link>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ILIAS</p>
                <h3>Fast entry points</h3>
              </div>
              <Link href="/courses" className="inline-link">
                Navigate
              </Link>
            </div>
            <div className="stack">
              {[...dashboard.ilias.mainbarLinks, ...dashboard.ilias.topCategories].map((link) => (
                <Link key={`${link.label}-${link.url}`} className="list-row" href={`/spaces?target=${encodeURIComponent(link.url)}`}>
                  <strong>{link.label}</strong>
                  <span>Open internally</span>
                </Link>
              ))}
            </div>
          </article>
        </section>
      </AppShell>
    );
  } catch (error) {
    const message =
      error instanceof PortalApiError ? error.message : "The dashboard could not load live portal data.";
    return (
      <AppShell title="Overview" kicker="Live dashboard">
        <ErrorPanel title="Backend unavailable" message={message} />
      </AppShell>
    );
  }
}
