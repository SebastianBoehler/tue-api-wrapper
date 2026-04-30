import { useEffect, useState } from "react";

import { fetchCourseDetail } from "../../lib/api";
import { courseNavigationUrl, extractCourseDetailUrl } from "../../lib/course-detail-url";
import type { DashboardAgendaItem } from "../../lib/dashboard-types";
import type { UnifiedCourseDetail } from "../../lib/course-types";
import { PanelHeader } from "./DashboardPrimitives";

export function CourseDetailPanel({
  baseUrl,
  event,
  term
}: {
  baseUrl: string | null;
  event: DashboardAgendaItem | null;
  term?: string | null;
}) {
  const [detail, setDetail] = useState<UnifiedCourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!baseUrl || !event) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError(null);
    void fetchCourseDetail(baseUrl, {
      title: courseLookupQuery(event.summary),
      term,
      url: extractCourseDetailUrl(event)
    })
      .then(setDetail)
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : "Course lookup failed."))
      .finally(() => setLoading(false));
  }, [baseUrl, event, term]);

  if (!event) {
    return null;
  }

  return (
    <aside className="panel course-detail-panel">
      <PanelHeader title="Course details" meta={loading ? "Loading" : detail?.alma.number ?? "Alma"} />
      <h3>{detail?.alma.title ?? event.summary}</h3>
      <p className="muted">{event.location || "Location pending"}</p>

      <div className="header-actions">
        {event.location ? (
          <button className="secondary-button" onClick={() => void window.desktop.openExternal(courseNavigationUrl(event.location))}>
            Navigate
          </button>
        ) : null}
        {detail?.alma.source_url ? (
          <button className="secondary-button" onClick={() => void window.desktop.openExternal(detail.alma.source_url)}>
            Open Alma
          </button>
        ) : null}
      </div>

      {error ? <p className="inline-error">{error}</p> : null}

      <div className="detail-section-list">
        {detail?.portal_statuses.map((status) => (
          <div key={status.portal} className="detail-line">
            <strong>{portalLabel(status.portal)}</strong>
            <span>{status.message || status.match_reason || status.status}</span>
          </div>
        ))}
        {detail?.alma.sections.map((section) => (
          <section key={section.title}>
            <h4>{section.title}</h4>
            {section.fields.map((field) => (
              <div key={`${section.title}-${field.label}`} className="detail-line">
                <strong>{field.label}</strong>
                <span>{field.value}</span>
              </div>
            ))}
          </section>
        ))}
        {detail?.alma.module_study_program_tables.map((table) => (
          <section key={table.title}>
            <h4>{table.title}</h4>
            {table.rows.map((row, index) => (
              <div key={`${table.title}-${index}`} className="detail-line">
                <strong>{row[0] || table.headers[0] || "Entry"}</strong>
                <span>{row.slice(1).filter(Boolean).join(" · ")}</span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}

function courseLookupQuery(title: string): string {
  return title.match(/\b[A-Z]{2,12}[-\s]?\d{2,5}[A-Z]?\b/)?.[0] ?? title;
}

function portalLabel(portal: string): string {
  if (portal === "alma") return "Alma";
  if (portal === "ilias") return "ILIAS";
  if (portal === "moodle") return "Moodle";
  return portal;
}
