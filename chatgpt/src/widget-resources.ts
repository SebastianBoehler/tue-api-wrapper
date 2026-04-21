import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
} from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const widgetJs = readFileSync(join(projectRoot, "web/dist/widget.js"), "utf8");
const widgetCss = readFileSync(join(projectRoot, "web/dist/widget.css"), "utf8");

const widgetDomain = process.env.APP_BASE_URL;
const apiBaseUrl = process.env.PORTAL_API_BASE_URL;

export const widgetUri = "ui://study-hub/dashboard-v3.html";
export const detailWidgetUri = "ui://study-hub/detail-v3.html";
export const actionWidgetUri = "ui://study-hub/action-v3.html";

function buildWidgetHtml(template: "dashboard" | "detail" | "action") {
  const meta: Record<string, unknown> = {
    ui: {
      prefersBorder: true,
      csp: {
        connectDomains: apiBaseUrl ? [apiBaseUrl] : [],
        resourceDomains: [],
      },
    },
    "openai/widgetDescription":
      template === "detail"
        ? "Shows a host modal with focused details for a selected study item."
        : template === "action"
          ? "Shows a human confirmation screen for a prepared critical university action with Proceed and Cancel controls."
          : "Shows an interactive study dashboard with upcoming Alma events, open ILIAS tasks, exam progress, documents, and learning spaces.",
  };

  if (widgetDomain) {
    meta.ui = {
      ...(meta.ui as Record<string, unknown>),
      domain: widgetDomain,
    };
  }

  return {
    contents: [
      {
        uri: template === "detail" ? detailWidgetUri : template === "action" ? actionWidgetUri : widgetUri,
        mimeType: RESOURCE_MIME_TYPE,
        text: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${widgetCss}</style>
  </head>
  <body data-template="${template}">
    <div id="root"></div>
    <script type="module">${widgetJs}</script>
  </body>
</html>`,
        _meta: meta,
      },
    ],
  };
}

export function registerWidgetResources(server: McpServer) {
  registerAppResource(
    server,
    "study-hub-widget",
    widgetUri,
    {},
    async () => buildWidgetHtml("dashboard"),
  );
  registerAppResource(
    server,
    "study-hub-detail-widget",
    detailWidgetUri,
    {},
    async () => buildWidgetHtml("detail"),
  );
  registerAppResource(
    server,
    "study-hub-action-widget",
    actionWidgetUri,
    {},
    async () => buildWidgetHtml("action"),
  );
}
