import { useEffect, useState } from "react";

import type { DesktopRuntimeState } from "../shared/desktop-types";
import { DashboardScreen } from "./components/DashboardScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { StatusBanner } from "./components/StatusBanner";
import { useDashboard } from "./lib/use-dashboard";

export function App() {
  const [state, setState] = useState<DesktopRuntimeState | null>(null);
  const desktop = window.desktop;

  useEffect(() => {
    if (!desktop) {
      return undefined;
    }

    let mounted = true;
    void desktop.getState().then((nextState) => {
      if (mounted) {
        setState(nextState);
      }
    });

    const unsubscribe = desktop.onStateChanged((nextState) => {
      setState(nextState);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [desktop]);

  const dashboard = useDashboard(state?.backendUrl ?? null, state?.backendState === "ready");

  if (!desktop) {
    return (
      <div className="app-shell centered-state">
        Desktop runtime bridge unavailable. Restart the Electron app from the desktop dev command.
      </div>
    );
  }

  if (!state) {
    return <div className="app-shell centered-state">Loading desktop shell...</div>;
  }

  return (
    <div className="app-shell">
      <StatusBanner state={state} />

      {!state.hasCredentials ? (
        <OnboardingScreen
          onSubmit={(username, password) => desktop.saveCredentials({ username, password })}
        />
      ) : state.backendState === "ready" || state.backendState === "starting" ? (
        <DashboardScreen
          state={state}
          data={dashboard.data}
          loading={dashboard.loading || state.backendState === "starting"}
          error={state.backendError ?? dashboard.error}
          onRefresh={dashboard.refresh}
          onRestart={() => desktop.restartBackend()}
          onClearCredentials={() => desktop.clearCredentials()}
        />
      ) : (
        <div className="centered-panel">
          <h1>Backend unavailable</h1>
          <p>{state.backendError || "The local backend is not currently available."}</p>
          <div className="header-actions">
            <button className="secondary-button" onClick={() => void desktop.restartBackend()}>
              Restart backend
            </button>
            <button className="ghost-button" onClick={() => void desktop.clearCredentials()}>
              Forget credentials
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
