import { BrowserWindow, shell } from "electron";
import path from "node:path";

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: "#0c1220",
    title: "TUE Study Hub",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_OPEN_DEVTOOLS === "1") {
    window.webContents.openDevTools({ mode: "detach" });
  }

  if (!require("electron").app.isPackaged) {
    void window.loadURL("http://127.0.0.1:5173");
    return window;
  }

  void window.loadFile(path.join(__dirname, "..", "..", "dist-renderer", "index.html"));
  return window;
}
