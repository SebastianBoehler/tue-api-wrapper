import { formatCredits } from "../../lib/format";
import { EmptyState, PanelHeader } from "./DashboardPrimitives";
import type { DashboardPageProps } from "./types";

export function StudyPage({ data, state }: DashboardPageProps) {
  const studyNote = data?.study.currentSemesterCreditError
    ?? (data?.study.currentSemesterCreditUnresolved?.length
      ? `${data.study.currentSemesterCreditUnresolved.length} timetable entries have no CP value.`
      : "Live Alma values are reflected in the saved semester total.");

  return (
    <div className="content-grid">
      <article className="panel">
        <PanelHeader title="Study progress" meta={formatCredits(data?.study.currentSemesterCredits)} />
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
          <div className="stack-row compact-row">
            <div>
              <strong>Passed exams</strong>
              <span>Derived from the Alma exam overview</span>
            </div>
            <span>{data?.study.passedExamCount ?? 0}</span>
          </div>
        </div>
      </article>

      <article className="panel">
        <PanelHeader title="Exam records" meta={`${data?.exams.length ?? 0} loaded`} />
        <div className="stack-list">
          {(data?.exams ?? []).map((exam) => (
            <div key={`${exam.number}-${exam.title}`} className="stack-row compact-row">
              <div>
                <strong>{exam.title}</strong>
                <span>{exam.number || exam.status || "No structured label available"}</span>
              </div>
              <span>{exam.grade || exam.status || "Pending"}</span>
            </div>
          ))}
          {data?.exams.length === 0 ? <EmptyState>No exam records returned by Alma.</EmptyState> : null}
        </div>
      </article>

      <article className="panel wide-panel">
        <PanelHeader title="Documents" meta={`${data?.documents.reports.length ?? 0} report jobs`} />
        <div className="action-list">
          {state.backendUrl && data?.documents.currentDownloadUrl ? (
            <button
              className="secondary-button full-width"
              onClick={() => void window.desktop.openExternal(`${state.backendUrl}${data.documents.currentDownloadUrl}`)}
              type="button"
            >
              Open current Alma PDF
            </button>
          ) : null}
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
