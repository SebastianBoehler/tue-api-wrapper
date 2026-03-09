import Link from "next/link";
import { AppShell } from "../../../components/app-shell";
import { ErrorPanel } from "../../../components/error-panel";
import { getModuleDetail, PortalApiError } from "../../../lib/portal-api";

export default async function CourseDetailPage({
  searchParams
}: {
  searchParams?: Promise<{ url?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const detailUrl = resolvedSearchParams.url?.trim();

  if (!detailUrl) {
    return (
      <AppShell title="Course Detail" kicker="Internal detail view">
        <ErrorPanel title="Course detail unavailable" message="No Alma detail URL was provided." />
      </AppShell>
    );
  }

  try {
    const detail = await getModuleDetail(detailUrl);

    return (
      <AppShell title="Course Detail" kicker="Internal detail view">
        <section className="hero-card slim">
          <div>
            <p className="eyebrow">Public Alma detail</p>
            <h2>{detail.title}</h2>
            <p className="hero-copy">
              {detail.number ? `${detail.number} ` : ""}rendered through the unofficial API so the flow stays inside
              the app.
            </p>
          </div>
          <div className="hero-actions">
            <Link href="/courses" className="action-link ghost">
              Back to discovery
            </Link>
            {detail.permalink ? (
              <a href={detail.permalink} className="inline-link">
                Source permalink
              </a>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <div className="results-summary">
            <div>
              <p className="eyebrow">Detail tabs</p>
              <h3>{detail.active_tab ?? "Detail data"}</h3>
            </div>
            <div className="selected-chip-row">
              {detail.available_tabs.map((tab) => (
                <span key={tab} className={tab === detail.active_tab ? "selected-chip" : "status-pill"}>
                  {tab}
                </span>
              ))}
            </div>
          </div>
          <div className="detail-section-grid">
            {detail.sections.map((section) => (
              <article key={section.title} className="detail-card">
                <p className="eyebrow">{section.title}</p>
                <div className="detail-field-list">
                  {section.fields.map((field) => (
                    <div key={`${section.title}-${field.label}`} className="detail-field">
                      <span>{field.label}</span>
                      <strong>{field.value}</strong>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </AppShell>
    );
  } catch (error: unknown) {
    const message =
      error instanceof PortalApiError ? error.message : "The course detail view could not load live Alma data.";
    return (
      <AppShell title="Course Detail" kicker="Internal detail view">
        <ErrorPanel title="Course detail unavailable" message={message} />
      </AppShell>
    );
  }
}
