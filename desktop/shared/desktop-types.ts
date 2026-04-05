export type BackendLifecycleState = "missing_credentials" | "starting" | "ready" | "error" | "stopped";

export interface CredentialInput {
  username: string;
  password: string;
}

export interface DesktopRuntimeState {
  hasCredentials: boolean;
  username: string | null;
  backendState: BackendLifecycleState;
  backendUrl: string | null;
  backendError: string | null;
}
