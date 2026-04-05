import { app, BrowserWindow } from "electron";

import { BackendManager } from "./backend-manager";
import { CredentialStore } from "./credential-store";
import { registerIpc } from "./ipc";
import { createMainWindow } from "./window";

let mainWindow: BrowserWindow | null = null;
let backendManager: BackendManager | null = null;

async function bootstrap(): Promise<void> {
  await app.whenReady();

  const store = new CredentialStore(app.getPath("userData"));
  backendManager = new BackendManager(store);
  registerIpc(backendManager);
  await backendManager.initialize();

  mainWindow = createMainWindow();
  mainWindow.webContents.once("did-finish-load", () => {
    mainWindow?.webContents.send("desktop:state-changed", backendManager?.getState());
  });

  backendManager.on("state-changed", (state) => {
    mainWindow?.webContents.send("desktop:state-changed", state);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  await backendManager?.dispose();
});

void bootstrap();
