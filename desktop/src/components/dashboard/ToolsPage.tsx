import { PanelHeader } from "./DashboardPrimitives";
import type { DashboardPageProps } from "./types";

export function ToolsPage({ data, state }: DashboardPageProps) {
  const links = state.backendUrl
    ? [
      { label: "Backend API docs", url: `${state.backendUrl}/docs`, detail: "OpenAPI reference" },
      { label: "Dashboard JSON", url: `${state.backendUrl}/api/dashboard`, detail: "Current desktop payload" },
      { label: "Moodle grades", url: `${state.backendUrl}/api/moodle/grades`, detail: "Grades endpoint" },
      { label: "Campus buildings", url: `${state.backendUrl}/api/campus/buildings`, detail: "Campus directory" }
    ]
    : [];

  if (state.backendUrl && data?.documents.currentDownloadUrl) {
    links.push({
      label: "Current Alma PDF",
      url: `${state.backendUrl}${data.documents.currentDownloadUrl}`,
      detail: "Latest official document"
    });
  }

  return (
    <div className="content-grid">
      <article className="panel">
        <PanelHeader title="Backend tools" meta={state.backendUrl ? "Local API" : "Unavailable"} />
        <div className="stack-list">
          {links.map((link) => (
            <button key={link.url} className="link-row" onClick={() => void window.desktop.openExternal(link.url)} type="button">
              <div>
                <strong>{link.label}</strong>
                <span>{link.detail}</span>
              </div>
              <span>Open</span>
            </button>
          ))}
        </div>
      </article>

      <article className="panel">
        <PanelHeader title="Report jobs" meta={`${data?.documents.reports.length ?? 0} available`} />
        <div className="stack-list">
          {(data?.documents.reports ?? []).map((report) => (
            <div key={report.trigger_name} className="stack-row compact-row">
              <div>
                <strong>{report.label}</strong>
                <span>{report.trigger_name}</span>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
