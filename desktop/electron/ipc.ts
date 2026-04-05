import { ipcMain, shell } from "electron";

import type { CredentialInput } from "../shared/desktop-types";
import { BackendManager } from "./backend-manager";

export function registerIpc(manager: BackendManager): void {
  ipcMain.handle("desktop:get-state", () => manager.getState());
  ipcMain.handle("desktop:save-credentials", (_event, input: CredentialInput) => manager.saveCredentials(input));
  ipcMain.handle("desktop:clear-credentials", () => manager.clearCredentials());
  ipcMain.handle("desktop:restart-backend", () => manager.restart());
  ipcMain.handle("desktop:open-external", (_event, url: string) => shell.openExternal(url));
}
