import { randomBytes, randomUUID } from "node:crypto";

import { PortalBackendError } from "../backend.js";
import type { CriticalActionPublicIntent, CriticalActionResult } from "../types/actions.js";
import { asStructured, toolErrorResponse } from "../tool-runtime.js";

export interface StoredCriticalAction {
  intent: CriticalActionPublicIntent;
  token: string;
  execute: () => Promise<CriticalActionResult>;
}

const pendingActions = new Map<string, StoredCriticalAction>();
const expiryMs = 10 * 60 * 1000;

export function actionAnnotations(destructiveHint: boolean) {
  return {
    readOnlyHint: !destructiveHint,
    destructiveHint,
    openWorldHint: false,
    idempotentHint: false,
  };
}

export function storeAction(
  data: Omit<CriticalActionPublicIntent, "id" | "preparedAt" | "expiresAt">,
  execute: () => Promise<CriticalActionResult>,
) {
  const now = new Date();
  const intent: CriticalActionPublicIntent = {
    ...data,
    id: randomUUID(),
    preparedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + expiryMs).toISOString(),
  };
  const stored: StoredCriticalAction = {
    intent,
    token: randomBytes(24).toString("base64url"),
    execute,
  };
  pendingActions.set(intent.id, stored);
  return stored;
}

export function preparedResponse(stored: StoredCriticalAction) {
  return {
    structuredContent: asStructured({
      view: "critical-action",
      intent: stored.intent,
    }),
    content: [
      {
        type: "text" as const,
        text: `Showing a confirmation UI for ${stored.intent.actionLabel}. No upstream action has been submitted.`,
      },
    ],
    _meta: {
      intent: stored.intent,
      confirmationToken: stored.token,
    },
  };
}

export async function prepareTool(loader: () => Promise<StoredCriticalAction>) {
  try {
    return preparedResponse(await loader());
  } catch (error) {
    if (error instanceof PortalBackendError) {
      return toolErrorResponse(error);
    }
    throw error;
  }
}

export function consumePendingAction(intentId: string, confirmationToken: string): StoredCriticalAction {
  const stored = pendingActions.get(intentId);
  if (!stored || stored.token !== confirmationToken) {
    throw new PortalBackendError("This confirmation is no longer valid. Prepare the action again.");
  }
  pendingActions.delete(intentId);
  if (Date.parse(stored.intent.expiresAt) <= Date.now()) {
    throw new PortalBackendError("This confirmation expired. Prepare the action again.");
  }
  return stored;
}
