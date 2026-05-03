import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import getPort, { portNumbers } from "get-port";

import type { CredentialInput, DesktopRuntimeState, DiscoverySettings } from "../shared/desktop-types";
import { resolveBackendRuntime } from "./backend-runtime";
import { CredentialStore } from "./credential-store";
import { DEFAULT_DISCOVERY_SETTINGS, DiscoverySettingsStore, normalizeDiscoverySettings } from "./discovery-settings-store";

const START_TIMEOUT_MS = 20_000;
const SHUTDOWN_TIMEOUT_MS = 3_000;

export class BackendManager extends EventEmitter {
  private process: BackendProcess | null = null;
  private lastStderrLine = "";
  private state: DesktopRuntimeState = {
    hasCredentials: false,
    username: null,
    backendState: "missing_credentials",
    backendUrl: null,
    backendError: null,
    discoverySettings: DEFAULT_DISCOVERY_SETTINGS
  };

  constructor(
    private readonly store: CredentialStore,
    private readonly discoverySettingsStore: DiscoverySettingsStore
  ) {
    super();
  }

  getState(): DesktopRuntimeState {
    return { ...this.state };
  }

  async initialize(): Promise<void> {
    const discoverySettings = await this.discoverySettingsStore.load();
    this.updateState({ discoverySettings });
    const credentials = await this.store.load();
    if (!credentials) {
      this.updateState({
        hasCredentials: false,
        username: null,
        backendState: "missing_credentials",
        backendUrl: null,
        backendError: null
      });
      return;
    }
    await this.start(credentials);
  }

  async saveCredentials(input: CredentialInput): Promise<void> {
    const normalized = normalizeCredentials(input);
    await this.store.save(normalized);
    await this.start(normalized);
  }

  async clearCredentials(): Promise<void> {
    await this.stop();
    await this.store.clear();
    this.updateState({
      hasCredentials: false,
      username: null,
      backendState: "missing_credentials",
      backendUrl: null,
      backendError: null
    });
  }

  async restart(): Promise<void> {
    const credentials = await this.store.load();
    if (!credentials) {
      this.updateState({
        hasCredentials: false,
        username: null,
        backendState: "missing_credentials",
        backendUrl: null,
        backendError: null
      });
      return;
    }
    await this.start(credentials);
  }

  async saveDiscoverySettings(input: DiscoverySettings): Promise<DiscoverySettings> {
    const discoverySettings = await this.discoverySettingsStore.save(normalizeDiscoverySettings(input));
    this.updateState({ discoverySettings });
    const credentials = await this.store.load();
    if (credentials) {
      await this.start(credentials);
    }
    return discoverySettings;
  }

  async dispose(): Promise<void> {
    await this.stop();
  }

  private async start(credentials: CredentialInput): Promise<void> {
    await this.stop();

    const port = await getPort({ port: portNumbers(18123, 18163) });
    const backendUrl = `http://127.0.0.1:${port}`;
    const runtime = resolveBackendRuntime();
    const discoverySettings = await this.discoverySettingsStore.load();

    this.lastStderrLine = "";
    this.updateState({
      hasCredentials: true,
      username: credentials.username,
      backendState: "starting",
      backendUrl,
      backendError: null,
      discoverySettings
    });

    const child = spawn(runtime.command, runtime.args, {
      env: {
        ...process.env,
        ...runtime.env,
        ...discoveryEnv(discoverySettings),
        PORT: String(port),
        UNI_USERNAME: credentials.username,
        UNI_PASSWORD: credentials.password
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    this.process = child;
    child.stdout.on("data", (chunk) => {
      console.info(`[desktop-backend] ${String(chunk).trimEnd()}`);
    });
    child.stderr.on("data", (chunk) => {
      const text = String(chunk).trimEnd();
      if (text) {
        this.lastStderrLine = text.split("\n").at(-1) ?? text;
        console.error(`[desktop-backend] ${text}`);
      }
    });

    child.once("error", (error) => {
      if (this.process !== child) {
        return;
      }
      this.process = null;
      this.updateState({
        backendState: "error",
        backendError: `Could not start the local Python backend: ${error.message}`
      });
    });

    child.once("exit", (code, signal) => {
      if (this.process !== child) {
        return;
      }
      this.process = null;
      const details = this.lastStderrLine ? ` ${this.lastStderrLine}` : "";
      this.updateState({
        backendState: "error",
        backendError: `The local Python backend exited unexpectedly (${signal ?? code ?? "unknown"}).${details}`
      });
    });

    const ready = await waitForHealth(backendUrl, START_TIMEOUT_MS);
    if (this.process !== child) {
      return;
    }
    if (!ready) {
      await this.stop();
      this.updateState({
        backendState: "error",
        backendError: "The local Python backend did not become ready in time."
      });
      return;
    }

    this.updateState({
      backendState: "ready",
      backendError: null
    });
  }

  private async stop(): Promise<void> {
    const child = this.process;
    if (!child) {
      return;
    }

    this.process = null;
    child.kill("SIGTERM");

    await Promise.race([
      onceExit(child),
      wait(SHUTDOWN_TIMEOUT_MS).then(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      })
    ]);
  }

  private updateState(patch: Partial<DesktopRuntimeState>): void {
    this.state = {
      ...this.state,
      ...patch
    };
    this.emit("state-changed", this.getState());
  }
}

function discoveryEnv(settings: DiscoverySettings): Record<string, string> {
  if (!settings.semanticSearchEnabled) {
    return {
      TUE_DISCOVERY_EMBEDDINGS: "off",
      TUE_DISCOVERY_VECTOR_STORE: "memory"
    };
  }
  return {
    TUE_DISCOVERY_EMBEDDINGS: "local",
    TUE_DISCOVERY_VECTOR_STORE: settings.vectorStore,
    TUE_DISCOVERY_MODEL: settings.embeddingModel
  };
}

function normalizeCredentials(input: CredentialInput): CredentialInput {
  const username = input.username.trim();
  const password = input.password.trim();
  if (!username || !password) {
    throw new Error("Username and password are both required.");
  }
  return { username, password };
}

async function waitForHealth(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return true;
      }
    } catch {
      // Keep polling until the sidecar is ready or times out.
    }
    await wait(350);
  }
  return false;
}

function onceExit(child: BackendProcess): Promise<void> {
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type BackendProcess = ReturnType<typeof spawn>;
