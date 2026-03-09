import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { buildPortalApiUrl, getDocuments, PortalApiError } from "../../lib/portal-api";

export default async function DocumentsPage() {
  try {
    const documents = await getDocuments();

    return (
      <AppShell title="Documents" kicker="Study-service paperwork">
        <section className="hero-card slim">
          <div>
            <p className="eyebrow">Certificates and proofs</p>
            <h2>Make the bureaucratic path legible</h2>
            <p className="hero-copy">
              Show what Alma can actually download right now, and keep the rest clearly labeled as server-side report jobs.
            </p>
          </div>
        </section>

        {documents.currentDownloadUrl ? (
          <section className="panel">
            <p className="eyebrow">Live download</p>
            <h3>Current Alma PDF</h3>
            <p>The study-service page is currently exposing a downloadable PDF.</p>
            <a href={buildPortalApiUrl(documents.currentDownloadUrl)} className="inline-link">
              Download current document
            </a>
          </section>
        ) : (
          <section className="panel">
            <p className="eyebrow">Live download</p>
            <h3>No current PDF exposed</h3>
            <p>
              Alma is not currently rendering a direct `docdownload` link on the study-service page.
              The report jobs below are visible, but they are not directly downloadable from the current request-only flow.
            </p>
          </section>
        )}

        <section className="stack">
          {documents.reports.map((document) => (
            <article key={document.trigger_name} className="panel">
              <p className="eyebrow">Document export job</p>
              <h3>{document.label}</h3>
              <p className="mono">{document.trigger_name}</p>
            </article>
          ))}
        </section>
      </AppShell>
    );
  } catch (error) {
    const message =
      error instanceof PortalApiError ? error.message : "The documents view could not load live Alma data.";
    return (
      <AppShell title="Documents" kicker="Study-service paperwork">
        <ErrorPanel title="Documents unavailable" message={message} />
      </AppShell>
    );
  }
}
