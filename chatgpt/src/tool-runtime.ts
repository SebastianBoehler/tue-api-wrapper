import { z } from "zod";

import { PortalBackendError } from "./backend.js";
import type { DashboardPayload } from "./types.js";

export const limitSchema = z.number().int().min(1).max(20).optional();
export const courseFilterListSchema = z.array(z.string().min(1)).max(12).optional();

export function readOnlyAnnotations() {
  return {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    idempotentHint: true,
  };
}

export function toolErrorResponse(error: PortalBackendError) {
  return {
    structuredContent: {
      error: error.message,
    },
    content: [
      {
        type: "text" as const,
        text: error.message,
      },
    ],
    _meta: {
      error: error.message,
    },
  };
}

export function widgetErrorResponse(error: PortalBackendError) {
  return {
    structuredContent: {
      view: "error" as const,
      message: error.message,
    },
    content: [
      {
        type: "text" as const,
        text: error.message,
      },
    ],
    _meta: {
      error: error.message,
    },
  };
}

export async function runReadTool<T>(loader: () => Promise<T>) {
  try {
    return await loader();
  } catch (error) {
    if (error instanceof PortalBackendError) {
      return toolErrorResponse(error);
    }
    throw error;
  }
}

export async function runWidgetTool<T>(loader: () => Promise<T>) {
  try {
    return await loader();
  } catch (error) {
    if (error instanceof PortalBackendError) {
      return widgetErrorResponse(error);
    }
    throw error;
  }
}

export function buildSnapshot(dashboard: DashboardPayload, limit = 5) {
  return {
    generatedAt: dashboard.generatedAt,
    termLabel: dashboard.termLabel,
    study: dashboard.study,
    metrics: dashboard.metrics,
    nextEvents: dashboard.agenda.items.slice(0, limit),
    openTasks: dashboard.ilias.tasks.slice(0, limit),
    grades: dashboard.exams.slice(0, limit),
    learningSpaces: dashboard.ilias.memberships.slice(0, limit),
    documents: {
      reports: dashboard.documents.reports.slice(0, limit),
      currentDownloadAvailable: dashboard.documents.currentDownloadAvailable,
    },
  };
}

export function asStructured(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}
