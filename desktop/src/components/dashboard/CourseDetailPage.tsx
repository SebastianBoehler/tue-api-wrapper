import { useEffect, useMemo, useState } from "react";

import { fetchCourseDetail } from "../../lib/api";
import { courseLookupQuery, courseNavigationUrl, stripCourseCode } from "../../lib/course-detail-url";
import type { AlmaCourseSlot } from "../../lib/dashboard-types";
import type { AlmaCourseDetail, CourseDetailSection, CourseDetailTable, UnifiedCourseDetail } from "../../lib/course-types";
import { formatCredits, formatDateRange } from "../../lib/format";
import { EmptyState, PanelHeader } from "./DashboardPrimitives";
import type { CourseDetailTarget, DashboardPageProps } from "./types";

export function CourseDetailPage({
  baseUrl,
  onBack,
  target
}: {
  baseUrl: string | null;
  onBack: () => void;
  target: CourseDetailTarget;
}) {
  const [detail, setDetail] = useState<UnifiedCourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lookupTitle = target.title || target.assignment?.number || target.event?.summary || "Course";

  useEffect(() => {
    if (!baseUrl) {
      setError("Local backend is not connected.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchCourseDetail(baseUrl, {
      title: lookupTitle,
      term: target.term,
      url: target.url
    })
      .then((nextDetail) => {
        if (!cancelled) setDetail(nextDetail);
      })
      .catch((caughtError) => {
        if (!cancelled) setError(caughtError instanceof Error ? caughtError.message : "Course lookup failed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl, lookupTitle, target.term, target.url]);

  const alma = detail?.alma ?? target.assignment?.detail ?? null;
  const code = alma?.number ?? target.assignment?.number ?? courseLookupQuery(lookupTitle);
  const title = alma?.title ?? target.assignment?.title ?? stripCourseCode(target.event?.summary ?? lookupTitle);
  const openAlmaUrl = alma?.permalink ?? alma?.source_url ?? target.url ?? target.assignment?.detail_url;
  const sections = useMemo(() => visibleSections(alma), [alma]);
  const tables = useMemo(() => dedupeTables(alma?.module_study_program_tables ?? []), [alma]);

  return (
    <div className="course-detail-page">
      <section className="panel course-detail-page-panel">
        <div className="course-detail-toolbar">
          <button className="ghost-button compact-button" onClick={onBack} type="button">Back</button>
          <span>{target.sourceLabel ?? "Course detail"}</span>
        </div>
        <div className="course-detail-heading">
          <div>
            <p className="eyebrow">Course detail</p>
            <h2>{title}</h2>
            <p className="muted">{code}</p>
          </div>
          <div className="course-actions">
            {target.event?.location ? (
              <button className="secondary-button" onClick={() => void window.desktop.openExternal(courseNavigationUrl(target.event?.location ?? ""))} type="button">
                Navigate
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
        </div>

        {loading ? <EmptyState>Loading Alma course detail...</EmptyState> : null}
        {error ? <p className={alma ? "muted" : "inline-error"}>{friendlyLookupError(error)}</p> : null}

        <div className="course-detail-grid">
          <section>
            <PanelHeader title="Overview" meta={target.term ?? null} />
            <div className="course-quick-facts">
              {courseFacts({ alma, code, target }).map((fact) => (
                <div key={fact.label} className="detail-line">
                  <strong>{fact.label}</strong>
                  <span>{fact.value}</span>
                </div>
              ))}
            </div>
          </section>

          {target.assignment?.slots?.length ? (
            <section>
              <PanelHeader title="Weekly slots" />
              <div className="detail-section-list">
                {target.assignment.slots.map((slot) => (
                  <div key={`${slot.weekday_label}-${slot.start_time}-${slot.location ?? ""}`} className="detail-line">
                    <strong>{slot.weekday_label}</strong>
                    <span>{slotText(slot)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {tables.length ? (
          <section className="course-detail-section">
            <PanelHeader title="Applicability" meta="Modules and degree programs" />
            <div className="detail-section-list">
              {tables.map((table, index) => <CourseTable key={`${table.title}-${index}`} table={table} />)}
            </div>
          </section>
        ) : null}

        {sections.length ? (
          <section className="course-detail-section">
            <PanelHeader title="Additional Alma fields" />
            <div className="detail-section-list">
              {sections.map((section, index) => <CourseSection key={`${section.title}-${index}`} section={section} />)}
            </div>
          </section>
        ) : null}

        {detail?.portal_statuses.length ? (
          <section className="course-detail-section">
            <PanelHeader title="Linked portals" />
            <div className="detail-section-list">
              {detail.portal_statuses.map((status) => (
                <div key={status.portal} className="detail-line">
                  <strong>{portalLabel(status.portal)}</strong>
                  <span>{status.message || status.match_reason || status.status}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {target.event?.description ? (
          <section className="course-detail-section">
            <PanelHeader title="Calendar source" />
            <p className="muted source-detail">{target.event.description}</p>
          </section>
        ) : null}
      </section>
    </div>
  );
}

function courseFacts({ alma, code, target }: { alma: AlmaCourseDetail | null; code: string; target: CourseDetailTarget }) {
  const event = target.event;
  const assignment = target.assignment;
  const entries: Array<[string, string | null | undefined]> = [
    ["Course code", code],
    ["Time", event ? formatDateRange(event.start, event.end) : null],
    ["Location", event?.location],
    ["Type", assignment?.event_type],
    ["Credits", typeof assignment?.credits === "number" ? formatCredits(assignment.credits) : null],
    ["Organization", assignment?.organization],
    ["Alma tab", alma?.active_tab]
  ];
  return entries.filter((entry): entry is [string, string] => Boolean(entry[1])).map(([label, value]) => ({ label, value }));
}

function visibleSections(alma: AlmaCourseDetail | null): CourseDetailSection[] {
  const seen = new Set<string>();
  return (alma?.sections ?? [])
    .filter((section) => !isDuplicateDetailSection(section.title))
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) => {
        const key = `${field.label}:${field.value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    }))
    .filter((section) => section.fields.length > 0);
}

function isDuplicateDetailSection(title: string): boolean {
  const normalized = title.toLocaleLowerCase("de-DE");
  return normalized.includes("semesterplanung") || normalized.includes("module") || normalized.includes("studiengänge");
}

function dedupeTables(tables: CourseDetailTable[]): CourseDetailTable[] {
  return tables.map((table) => {
    const seen = new Set<string>();
    return {
      ...table,
      rows: table.rows.filter((row) => {
        const key = row.join("\u0000");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    };
  }).filter((table) => table.rows.length > 0);
}

function CourseSection({ section }: { section: CourseDetailSection }) {
  return (
    <section>
      <h4>{section.title}</h4>
      {section.fields.map((field, index) => (
        <div key={`${section.title}-${field.label}-${index}`} className="detail-line">
          <strong>{field.label}</strong>
          <span>{field.value}</span>
        </div>
      ))}
    </section>
  );
}

function CourseTable({ table }: { table: CourseDetailTable }) {
  return (
    <section>
      <h4>{table.title}</h4>
      {table.rows.map((row, index) => (
        <div key={`${table.title}-${index}`} className="detail-line">
          <strong>{row[0] || table.headers[0] || "Entry"}</strong>
          <span>{row.slice(1).filter(Boolean).join(" · ")}</span>
        </div>
      ))}
    </section>
  );
}

function friendlyLookupError(error: string): string {
  return error.includes("No Alma detail page matched")
    ? "Alma did not return a matching detail page for this course."
    : error;
}

function iliasSearchUrl(query: string): string {
  const params = new URLSearchParams({ baseClass: "ilSearchControllerGUI", term: query });
  return `https://ovidius.uni-tuebingen.de/ilias.php?${params}`;
}

function slotText(slot: AlmaCourseSlot): string {
  const time = [slot.start_time, slot.end_time].filter(Boolean).join(" - ");
  return [time, slot.location].filter(Boolean).join(" · ");
}

function portalLabel(portal: string): string {
  if (portal === "alma") return "Alma";
  if (portal === "ilias") return "ILIAS";
  if (portal === "moodle") return "Moodle";
  return portal;
}
