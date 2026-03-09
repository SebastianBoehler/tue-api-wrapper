import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { fetchItem, loadDashboard, loadDocuments, searchItems } from "./backend.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const widgetJs = readFileSync(join(projectRoot, "web/dist/widget.js"), "utf8");
const widgetCss = readFileSync(join(projectRoot, "web/dist/widget.css"), "utf8");

const widgetUri = "ui://study-hub/dashboard-v1.html";
const widgetDomain = process.env.APP_BASE_URL;
const apiBaseUrl = process.env.PORTAL_API_BASE_URL;
const serverName = "tue-study-hub";

function buildWidgetHtml() {
  const meta: Record<string, unknown> = {
    ui: {
      prefersBorder: true,
      csp: {
        connectDomains: apiBaseUrl ? [apiBaseUrl] : [],
        resourceDomains: []
      }
    },
    "openai/widgetDescription":
      "Shows a compact study dashboard with upcoming Alma events, document jobs, exams, and ILIAS entry points."
  };

  if (widgetDomain) {
    meta.ui = {
      ...(meta.ui as Record<string, unknown>),
      domain: widgetDomain
    };
  }

  return {
    contents: [
      {
        uri: widgetUri,
        mimeType: RESOURCE_MIME_TYPE,
        text: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${widgetCss}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${widgetJs}</script>
  </body>
</html>`,
        _meta: meta
      }
    ]
  };
}

function readOnlyAnnotations() {
  return {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    idempotentHint: true
  };
}

function createAppServer() {
  const server = new McpServer({ name: serverName, version: "0.2.0" });

  registerAppResource(server, "study-hub-widget", widgetUri, {}, async () => buildWidgetHtml());

  registerAppTool(
    server,
    "search",
    {
      title: "Search unified study portal",
      description:
        "Use this when the user wants to search Alma and ILIAS items by topic, course name, or document label.",
      inputSchema: {
        query: z.string().min(1)
      },
      annotations: readOnlyAnnotations(),
      _meta: {}
    },
    async ({ query }) => {
      const results = await searchItems(query);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              results: results.map((item) => ({
                id: item.id,
                title: item.title,
                url: item.url
              }))
            })
          }
        ]
      };
    }
  );

  registerAppTool(
    server,
    "fetch",
    {
      title: "Fetch unified study item",
      description:
        "Use this when the user already has an item id from search and wants the full text for that Alma or ILIAS result.",
      inputSchema: {
        id: z.string().min(1)
      },
      annotations: readOnlyAnnotations(),
      _meta: {}
    },
    async ({ id }) => {
      const item = await fetchItem(id);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: item.id,
              title: item.title,
              text: item.text,
              url: item.url,
              metadata: item.metadata ?? {}
            })
          }
        ]
      };
    }
  );

  registerAppTool(
    server,
    "show_dashboard",
    {
      title: "Show study dashboard",
      description:
        "Use this when the user wants a compact overview of upcoming events, documents, exams, and ILIAS entry points.",
      inputSchema: {
        term: z.string().min(1).optional()
      },
      annotations: readOnlyAnnotations(),
      _meta: {
        ui: {
          resourceUri: widgetUri
        },
        "openai/outputTemplate": widgetUri,
        "openai/toolInvocation/invoking": "Building dashboard…",
        "openai/toolInvocation/invoked": "Dashboard ready"
      }
    },
    async ({ term }) => {
      const dashboard = await loadDashboard(term);
      return {
        structuredContent: {
          view: "dashboard",
          dashboard
        },
        content: [
          {
            type: "text",
            text: `Showing the unified study dashboard for ${dashboard.termLabel}.`
          }
        ],
        _meta: {
          dashboard
        }
      };
    }
  );

  registerAppTool(
    server,
    "list_documents",
    {
      title: "List study-service documents",
      description:
        "Use this when the user specifically wants Alma study-service document jobs or certificate options.",
      inputSchema: {},
      annotations: readOnlyAnnotations(),
      _meta: {
        ui: {
          resourceUri: widgetUri
        },
        "openai/outputTemplate": widgetUri,
        "openai/toolInvocation/invoking": "Loading documents…",
        "openai/toolInvocation/invoked": "Documents ready"
      }
    },
    async () => {
      const documents = await loadDocuments();
      return {
        structuredContent: {
          view: "documents",
          documents
        },
        content: [
          {
            type: "text",
            text: `Loaded ${documents.length} study-service document options.`
          }
        ],
        _meta: {
          documents
        }
      };
    }
  );

  return server;
}

const port = Number(process.env.PORT ?? 8080);
const MCP_PATH = "/mcp";
const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/plain" }).end("TUE Study Hub MCP server");
    return;
  }

  if (req.method === "OPTIONS" && url.pathname.startsWith(MCP_PATH)) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id"
    });
    res.end();
    return;
  }

  const supportedMethods = new Set(["GET", "POST", "DELETE"]);
  if (req.method && supportedMethods.has(req.method) && url.pathname === MCP_PATH) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const appServer = createAppServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on("close", () => {
      transport.close();
      appServer.close();
    });

    try {
      await appServer.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("MCP request error", error);
      if (!res.headersSent) {
        res.writeHead(500).end("Internal server error");
      }
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`TUE Study Hub MCP server listening on http://localhost:${port}${MCP_PATH}`);
});
