import { useEffect, useState } from "react";

import type { DesktopRuntimeState } from "../shared/desktop-types";
import { DashboardScreen } from "./components/DashboardScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { StatusBanner } from "./components/StatusBanner";
import { useDashboard } from "./lib/use-dashboard";

export function App() {
  const [state, setState] = useState<DesktopRuntimeState | null>(null);

  useEffect(() => {
    let mounted = true;
    void window.desktop.getState().then((nextState) => {
      if (mounted) {
        setState(nextState);
      }
    });

    const unsubscribe = window.desktop.onStateChanged((nextState) => {
      setState(nextState);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const dashboard = useDashboard(state?.backendUrl ?? null, state?.backendState === "ready");

  if (!state) {
    return <div className="app-shell centered-state">Loading desktop shell...</div>;
  }

  return (
    <div className="app-shell">
      <StatusBanner state={state} />

      {!state.hasCredentials ? (
        <OnboardingScreen
          onSubmit={(username, password) => window.desktop.saveCredentials({ username, password })}
        />
      ) : state.backendState === "ready" || state.backendState === "starting" ? (
        <DashboardScreen
          state={state}
          data={dashboard.data}
          loading={dashboard.loading || state.backendState === "starting"}
          error={state.backendError ?? dashboard.error}
          onRefresh={dashboard.refresh}
          onRestart={() => window.desktop.restartBackend()}
          onClearCredentials={() => window.desktop.clearCredentials()}
        />
      ) : (
        <div className="centered-panel">
          <h1>Backend unavailable</h1>
          <p>{state.backendError || "The local backend is not currently available."}</p>
          <div className="header-actions">
            <button className="secondary-button" onClick={() => void window.desktop.restartBackend()}>
              Restart backend
            </button>
            <button className="ghost-button" onClick={() => void window.desktop.clearCredentials()}>
              Forget credentials
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
