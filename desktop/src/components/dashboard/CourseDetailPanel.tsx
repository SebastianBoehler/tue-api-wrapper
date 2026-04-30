import { useEffect, useState } from "react";

import { fetchCourseDetail } from "../../lib/api";
import { courseNavigationUrl, extractCourseDetailUrl } from "../../lib/course-detail-url";
import type { AlmaTimetableCourseAssignment, DashboardAgendaItem } from "../../lib/dashboard-types";
import { formatCredits, formatDateRange } from "../../lib/format";
import type { AlmaCourseDetail, CourseDetailTable, UnifiedCourseDetail } from "../../lib/course-types";
import { PanelHeader } from "./DashboardPrimitives";

export function CourseDetailPanel({
  assignment,
  baseUrl,
  event,
  term
}: {
  assignment?: AlmaTimetableCourseAssignment | null;
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
      setError(null);
      setLoading(false);
      return;
    }

    const detailUrl = assignment?.detail_url ?? extractCourseDetailUrl(event);
    if (!detailUrl) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchCourseDetail(baseUrl, {
      title: assignment?.number ?? courseLookupQuery(event.summary),
      term,
      url: detailUrl
    })
      .then((nextDetail) => {
        if (!cancelled) {
          setDetail(nextDetail);
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Course lookup failed.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assignment?.detail_url, assignment?.number, baseUrl, event, term]);

  if (!event) {
    return null;
  }

  const alma = detail?.alma ?? assignment?.detail ?? null;
  const title = alma?.title ?? assignment?.title ?? stripCourseCode(event.summary);
  const code = alma?.number ?? assignment?.number ?? courseLookupQuery(event.summary);
  const openAlmaUrl = alma?.permalink ?? alma?.source_url ?? assignment?.detail_url ?? extractCourseDetailUrl(event);
  const lookupNotice = lookupMessage({ error, loading, assignment, alma });
  const isBlockingError = Boolean(error && !alma && !assignment && !error.includes("No Alma detail page matched"));

  return (
    <aside className="panel course-detail-panel">
      <PanelHeader title="Course details" meta={loading ? "Loading Alma" : code} />
      <div className="course-title-block">
        <h3>{title}</h3>
        <p className="muted">{event.summary}</p>
      </div>

      <div className="course-quick-facts">
        {courseFacts({ event, assignment, alma, code }).map((fact) => (
          <div key={fact.label} className="detail-line">
            <strong>{fact.label}</strong>
            <span>{fact.value}</span>
          </div>
        ))}
      </div>

      <div className="course-actions">
        {event.location ? (
          <button
            className="secondary-button"
            onClick={() => void window.desktop.openExternal(courseNavigationUrl(event.location ?? ""))}
            type="button"
          >
            Navigate to lecture
          </button>
        ) : null}
        {openAlmaUrl ? (
          <button className="secondary-button" onClick={() => void window.desktop.openExternal(openAlmaUrl)} type="button">
            Open Alma
          </button>
        ) : null}
        <button className="secondary-button" onClick={() => void window.desktop.openExternal(iliasSearchUrl(code || title))} type="button">
          Search ILIAS
        </button>
      </div>

      {lookupNotice ? <p className={isBlockingError ? "inline-error" : "muted"}>{lookupNotice}</p> : null}

      <div className="detail-section-list">
        {detail?.portal_statuses.map((status) => (
          <div key={status.portal} className="detail-line">
            <strong>{portalLabel(status.portal)}</strong>
            <span>{status.message || status.match_reason || status.status}</span>
          </div>
        ))}
        {assignment?.slots?.length ? (
          <section>
            <h4>Weekly slots</h4>
            {assignment.slots.map((slot) => (
              <div key={`${slot.weekday_label}-${slot.start_time}-${slot.location ?? ""}`} className="detail-line">
                <strong>{slot.weekday_label}</strong>
                <span>{slotText(slot)}</span>
              </div>
            ))}
          </section>
        ) : null}
        {alma?.sections.map((section) => (
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
        {alma?.module_study_program_tables.map((table) => (
          <section key={table.title}>
            <h4>{table.title}</h4>
            <CourseTableRows table={table} />
          </section>
        ))}
        {event.description ? (
          <section>
            <h4>Calendar detail</h4>
            <p className="muted source-detail">{event.description}</p>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function courseLookupQuery(title: string): string {
  return title.match(/\b[A-Z]{2,12}[-\s]?\d{2,5}[A-Z]?\b/)?.[0] ?? title;
}

function stripCourseCode(title: string): string {
  return title.replace(/^[A-Z]{2,12}[-\s]?\d{2,5}[A-Z]?\s+/i, "").trim() || title;
}

function courseFacts({
  event,
  assignment,
  alma,
  code
}: {
  event: DashboardAgendaItem;
  assignment?: AlmaTimetableCourseAssignment | null;
  alma: AlmaCourseDetail | null;
  code: string;
}) {
  const entries: Array<[string, string | null | undefined]> = [
    ["Course code", code],
    ["Time", formatDateRange(event.start, event.end)],
    ["Location", event.location],
    ["Type", assignment?.event_type],
    ["Credits", typeof assignment?.credits === "number" ? formatCredits(assignment.credits) : null],
    ["Credit source", assignment?.credit_source],
    ["Organization", assignment?.organization],
    ["Alma tab", alma?.active_tab]
  ];
  return entries
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => ({ label, value }));
}

function lookupMessage({
  error,
  loading,
  assignment,
  alma
}: {
  error: string | null;
  loading: boolean;
  assignment?: AlmaTimetableCourseAssignment | null;
  alma: AlmaCourseDetail | null;
}): string | null {
  if (loading) {
    return null;
  }
  if (error) {
    return friendlyLookupError(error);
  }
  if (assignment?.error && !alma) {
    return "Showing timetable details. Alma did not expose a linked detail page for this course.";
  }
  if (!alma) {
    return "Showing timetable details. No linked Alma detail page is available for this calendar entry.";
  }
  return null;
}

function friendlyLookupError(error: string): string {
  return error.includes("No Alma detail page matched")
    ? "Showing timetable details. Alma did not return a matching detail page for this course."
    : error;
}

function iliasSearchUrl(query: string): string {
  const params = new URLSearchParams({ baseClass: "ilSearchControllerGUI", term: query });
  return `https://ovidius.uni-tuebingen.de/ilias.php?${params}`;
}

function slotText(slot: AlmaTimetableCourseAssignment["slots"][number]): string {
  const time = [slot.start_time, slot.end_time].filter(Boolean).join(" - ");
  return [time, slot.location].filter(Boolean).join(" · ");
}

function CourseTableRows({ table }: { table: CourseDetailTable }) {
  return (
    <>
      {table.rows.map((row, index) => (
        <div key={`${table.title}-${index}`} className="detail-line">
          <strong>{row[0] || table.headers[0] || "Entry"}</strong>
          <span>{row.slice(1).filter(Boolean).join(" · ")}</span>
        </div>
      ))}
    </>
  );
}

function portalLabel(portal: string): string {
  if (portal === "alma") return "Alma";
  if (portal === "ilias") return "ILIAS";
  if (portal === "moodle") return "Moodle";
  return portal;
}
