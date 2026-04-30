import { useState } from "react";

import { PeopleSearchPanel } from "./PeopleSearchPanel";
import { PanelHeader } from "./DashboardPrimitives";
import { TimmsArchivePanel } from "./TimmsArchivePanel";
import type { DashboardPageProps } from "./types";

type ToolTab = "timms" | "people" | "backend";

export function ToolsPage({ data, state }: DashboardPageProps) {
  const [tab, setTab] = useState<ToolTab>("timms");
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
    <div className="tools-page">
      <section className="panel section-hero">
        <div>
          <p className="eyebrow">Discover</p>
          <h2>Archive, people, and local runtime tools</h2>
          <p className="muted">Public TIMMS videos, EPV directory search, and desktop sidecar endpoints.</p>
        </div>
        <div className="segmented-control">
          {([
            ["timms", "TIMMS"],
            ["people", "People"],
            ["backend", "Backend"]
          ] as const).map(([id, label]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)} type="button">
              {label}
            </button>
          ))}
        </div>
      </section>

      {tab === "timms" ? <TimmsArchivePanel baseUrl={state.backendUrl ?? null} /> : null}
      {tab === "people" ? <PeopleSearchPanel baseUrl={state.backendUrl ?? null} /> : null}
      {tab === "backend" ? <BackendTools links={links} reportCount={data?.documents.reports.length ?? 0} reports={data?.documents.reports ?? []} stateReady={Boolean(state.backendUrl)} /> : null}
    </div>
  );
}

function BackendTools({
  links,
  reportCount,
  reports,
  stateReady
}: {
  links: { label: string; url: string; detail: string }[];
  reportCount: number;
  reports: { label: string; trigger_name: string }[];
  stateReady: boolean;
}) {
  return (
    <div className="content-grid">
      <article className="panel">
        <PanelHeader title="Backend tools" meta={stateReady ? "Local API" : "Unavailable"} />
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
        <PanelHeader title="Report jobs" meta={`${reportCount} available`} />
        <div className="stack-list">
          {reports.map((report) => (
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
