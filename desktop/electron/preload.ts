import { contextBridge, ipcRenderer } from "electron";

import type { CredentialInput, DesktopRuntimeState } from "../shared/desktop-types";

contextBridge.exposeInMainWorld("desktop", {
  getState: (): Promise<DesktopRuntimeState> => ipcRenderer.invoke("desktop:get-state"),
  saveCredentials: (input: CredentialInput): Promise<void> => ipcRenderer.invoke("desktop:save-credentials", input),
  clearCredentials: (): Promise<void> => ipcRenderer.invoke("desktop:clear-credentials"),
  restartBackend: (): Promise<void> => ipcRenderer.invoke("desktop:restart-backend"),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke("desktop:open-external", url),
  onStateChanged: (listener: (state: DesktopRuntimeState) => void): (() => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, state: DesktopRuntimeState) => listener(state);
    ipcRenderer.on("desktop:state-changed", wrapped);
    return () => ipcRenderer.removeListener("desktop:state-changed", wrapped);
  }
});
