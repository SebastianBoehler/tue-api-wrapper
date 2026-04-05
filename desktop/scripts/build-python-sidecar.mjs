import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(desktopRoot, "..");
const packageRoot = path.join(repoRoot, "package");
const resourcesDir = path.join(desktopRoot, "resources", "backend");
const pythonEntrypoint = path.join(desktopRoot, "python", "desktop_backend_entry.py");
const executableName = process.platform === "win32" ? "tue-api-server.exe" : "tue-api-server";
const pythonCommand = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv
    }
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(pythonEntrypoint)) {
  console.error(`Missing sidecar entrypoint at ${pythonEntrypoint}`);
  process.exit(1);
}

mkdirSync(resourcesDir, { recursive: true });
rmSync(resourcesDir, { recursive: true, force: true });
mkdirSync(resourcesDir, { recursive: true });

run(
  pythonCommand,
  [
    "-m",
    "PyInstaller",
    "--noconfirm",
    "--clean",
    "--onefile",
    "--name",
    "tue-api-server",
    "--distpath",
    resourcesDir,
    "--workpath",
    path.join(desktopRoot, ".pyinstaller", "build"),
    "--specpath",
    path.join(desktopRoot, ".pyinstaller"),
    "--paths",
    path.join(packageRoot, "src"),
    pythonEntrypoint
  ],
  {
    PYTHONPATH: [path.join(packageRoot, "src"), process.env.PYTHONPATH]
      .filter(Boolean)
      .join(path.delimiter)
  }
);

const builtPath = path.join(resourcesDir, executableName);
if (!existsSync(builtPath)) {
  console.error(`Expected packaged backend at ${builtPath}`);
  process.exit(1);
}

console.log(`Built Python sidecar: ${builtPath}`);
