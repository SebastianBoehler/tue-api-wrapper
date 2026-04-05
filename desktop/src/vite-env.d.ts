/// <reference types="vite/client" />

import type { CredentialInput, DesktopRuntimeState } from "../shared/desktop-types";

declare global {
  interface Window {
    desktop: {
      getState(): Promise<DesktopRuntimeState>;
      saveCredentials(input: CredentialInput): Promise<void>;
      clearCredentials(): Promise<void>;
      restartBackend(): Promise<void>;
      openExternal(url: string): Promise<void>;
      onStateChanged(listener: (state: DesktopRuntimeState) => void): () => void;
    };
  }
}

export {};
