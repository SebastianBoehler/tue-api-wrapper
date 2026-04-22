import type { DesktopRuntimeState } from "../../shared/desktop-types";

export function StatusBanner({ state }: { state: DesktopRuntimeState }) {
  const label = statusLabel(state);
  const tone = state.backendState === "ready" ? "status-ready" : state.backendState === "error" ? "status-error" : "status-pending";

  return (
    <div className={`status-banner ${tone}`}>
      <div>
        <p className="eyebrow">Runtime</p>
        <h2>{label}</h2>
      </div>
      <div className="status-meta">
        {state.username ? <span>Signed in as {state.username}</span> : null}
        {state.backendUrl ? <span>Local API ready</span> : null}
      </div>
    </div>
  );
}

function statusLabel(state: DesktopRuntimeState): string {
  switch (state.backendState) {
    case "ready":
      return "Local study backend is running";
    case "starting":
      return "Starting the local study backend";
    case "error":
      return "Desktop backend needs attention";
    case "stopped":
      return "Desktop backend is stopped";
    default:
      return "Complete onboarding to start the desktop app";
  }
}
