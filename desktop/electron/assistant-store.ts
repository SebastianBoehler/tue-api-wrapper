import { safeStorage } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { AssistantConfig } from "../shared/desktop-types";

const defaultConfig: AssistantConfig = {
  baseUrl: "http://127.0.0.1:1234/v1",
  model: "local-model",
  apiKey: ""
};

export class AssistantStore {
  constructor(private readonly userDataPath: string) {}

  async load(): Promise<AssistantConfig> {
    try {
      const payload = await fs.readFile(this.filePath());
      const parsed = JSON.parse(safeStorage.decryptString(payload)) as Partial<AssistantConfig>;
      return {
        baseUrl: parsed.baseUrl?.trim() || defaultConfig.baseUrl,
        model: parsed.model?.trim() || defaultConfig.model,
        apiKey: parsed.apiKey ?? ""
      };
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
        return defaultConfig;
      }
      throw new Error("Could not decrypt the stored assistant configuration.");
    }
  }

  async save(input: AssistantConfig): Promise<AssistantConfig> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Assistant configuration encryption is not available on this system.");
    }
    const config = {
      baseUrl: input.baseUrl.trim(),
      model: input.model.trim(),
      apiKey: input.apiKey
    };
    if (!config.baseUrl || !config.model) {
      throw new Error("Assistant base URL and model are required.");
    }
    await fs.mkdir(this.userDataPath, { recursive: true });
    await fs.writeFile(this.filePath(), safeStorage.encryptString(JSON.stringify(config)));
    return config;
  }

  private filePath(): string {
    return path.join(this.userDataPath, "assistant-config.bin");
  }
}
