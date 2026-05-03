import { app } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";

export interface BackendRuntime {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export function resolveBackendRuntime(): BackendRuntime {
  if (app.isPackaged) {
    const executable = path.join(
      process.resourcesPath,
      "backend",
      process.platform === "win32" ? "tue-api-server.exe" : "tue-api-server"
    );

    if (!existsSync(executable)) {
      throw new Error(`Packaged backend binary not found at ${executable}. Run npm run build:backend before packaging.`);
    }

    return {
      command: executable,
      args: [],
      env: {}
    };
  }

  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const packageRoot = path.join(repoRoot, "package");
  const venvPython = process.platform === "win32"
    ? path.join(packageRoot, ".venv", "Scripts", "python.exe")
    : path.join(packageRoot, ".venv", "bin", "python");
  const command = existsSync(venvPython)
    ? venvPython
    : process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");

  return {
    command,
    args: ["-m", "tue_api_wrapper.api_server"],
    env: {
      PYTHONPATH: [path.join(packageRoot, "src"), process.env.PYTHONPATH]
        .filter(Boolean)
        .join(path.delimiter)
    }
  };
}
