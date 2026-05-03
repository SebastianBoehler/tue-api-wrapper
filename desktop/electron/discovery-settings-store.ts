import { promises as fs } from "node:fs";
import path from "node:path";

import type { DiscoverySettings } from "../shared/desktop-types";

export const DEFAULT_DISCOVERY_SETTINGS: DiscoverySettings = {
  semanticSearchEnabled: false,
  vectorStore: "memory",
  embeddingModel: "sentence-transformers/all-MiniLM-L6-v2"
};

export class DiscoverySettingsStore {
  constructor(private readonly userDataPath: string) {}

  async load(): Promise<DiscoverySettings> {
    try {
      const payload = await fs.readFile(this.filePath(), "utf-8");
      return normalizeDiscoverySettings(JSON.parse(payload) as Partial<DiscoverySettings>);
    } catch (error) {
      if (isMissingFileError(error)) {
        return DEFAULT_DISCOVERY_SETTINGS;
      }
      throw new Error("Could not load discovery settings.");
    }
  }

  async save(input: DiscoverySettings): Promise<DiscoverySettings> {
    const normalized = normalizeDiscoverySettings(input);
    await fs.mkdir(this.userDataPath, { recursive: true });
    await fs.writeFile(this.filePath(), `${JSON.stringify(normalized, null, 2)}\n`);
    return normalized;
  }

  private filePath(): string {
    return path.join(this.userDataPath, "discovery-settings.json");
  }
}

export function normalizeDiscoverySettings(input: Partial<DiscoverySettings>): DiscoverySettings {
  const semanticSearchEnabled = Boolean(input.semanticSearchEnabled);
  return {
    semanticSearchEnabled,
    vectorStore: semanticSearchEnabled ? "lancedb" : "memory",
    embeddingModel: input.embeddingModel?.trim() || DEFAULT_DISCOVERY_SETTINGS.embeddingModel
  };
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
