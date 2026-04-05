import { safeStorage } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { CredentialInput } from "../shared/desktop-types";

export class CredentialStore {
  constructor(private readonly userDataPath: string) {}

  async load(): Promise<CredentialInput | null> {
    try {
      const payload = await fs.readFile(this.filePath());
      const decrypted = safeStorage.decryptString(payload);
      const parsed = JSON.parse(decrypted) as Partial<CredentialInput>;
      if (!parsed.username || !parsed.password) {
        return null;
      }
      return {
        username: parsed.username,
        password: parsed.password
      };
    } catch (error) {
      if (isMissingFileError(error)) {
        return null;
      }
      throw new Error("Could not decrypt the stored desktop credentials.");
    }
  }

  async save(input: CredentialInput): Promise<void> {
    this.ensureEncryptionAvailable();

    const encrypted = safeStorage.encryptString(
      JSON.stringify({
        username: input.username,
        password: input.password
      })
    );

    await fs.mkdir(this.userDataPath, { recursive: true });
    await fs.writeFile(this.filePath(), encrypted);
  }

  async clear(): Promise<void> {
    try {
      await fs.unlink(this.filePath());
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }
  }

  private ensureEncryptionAvailable(): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Desktop credential encryption is not available on this system.");
    }
  }

  private filePath(): string {
    return path.join(this.userDataPath, "credentials.bin");
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
