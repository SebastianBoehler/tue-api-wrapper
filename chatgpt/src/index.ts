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
import {
  fetchItem,
  loadCourseCatalogFilters,
  loadDashboard,
  loadEnrollments,
  loadExams,
  loadMemberships,
  loadTasks,
  loadTimetable,
  PortalBackendError,
  searchCourseCatalog,
  searchItems
} from "./backend.js";
import type { DashboardPayload } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const widgetJs = readFileSync(join(projectRoot, "web/dist/widget.js"), "utf8");
const widgetCss = readFileSync(join(projectRoot, "web/dist/widget.css"), "utf8");

const widgetUri = "ui://study-hub/dashboard-v1.html";
const widgetDomain = process.env.APP_BASE_URL;
const apiBaseUrl = process.env.PORTAL_API_BASE_URL;
const serverName = "tue-study-hub";
const defaultTerm = "Sommer 2026";
const limitSchema = z.number().int().min(1).max(20).optional();
const courseFilterListSchema = z.array(z.string().min(1)).max(12).optional();

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
      "Shows a compact study dashboard with upcoming Alma events, open ILIAS tasks, exam progress, documents, and learning spaces."
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

function toolErrorResponse(error: PortalBackendError) {
  return {
    structuredContent: {
      error: error.message
    },
    content: [
      {
        type: "text" as const,
        text: error.message
      }
    ],
    _meta: {
      error: error.message
    }
  };
}

function widgetErrorResponse(error: PortalBackendError) {
  return {
    structuredContent: {
      view: "error" as const,
      message: error.message
    },
    content: [
      {
        type: "text" as const,
        text: error.message
      }
    ],
    _meta: {
      error: error.message
    }
  };
}

async function runReadTool<T>(loader: () => Promise<T>): Promise<T | ReturnType<typeof toolErrorResponse>> {
  try {
    return await loader();
  } catch (error) {
    if (error instanceof PortalBackendError) {
      return toolErrorResponse(error);
    }
    throw error;
  }
}

async function runWidgetTool<T>(loader: () => Promise<T>): Promise<T | ReturnType<typeof widgetErrorResponse>> {
  try {
    return await loader();
  } catch (error) {
    if (error instanceof PortalBackendError) {
      return widgetErrorResponse(error);
    }
    throw error;
  }
}

function buildSnapshot(dashboard: DashboardPayload, limit = 5) {
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
      currentDownloadAvailable: dashboard.documents.currentDownloadAvailable
    }
  };
}

function asStructured(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function createAppServer() {
  const server = new McpServer({ name: serverName, version: "0.3.0" });

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
    async ({ query }) =>
      runReadTool(async () => {
        const results = await searchItems(query);
        return {
          structuredContent: {
            results
          },
          content: [
            {
              type: "text" as const,
              text: `Found ${results.length} matching unified study items for "${query}".`
            }
          ],
          _meta: {
            results
          }
        };
      })
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
    async ({ id }) =>
      runReadTool(async () => {
        const item = await fetchItem(id);
        return {
          structuredContent: {
            item
          },
          content: [
            {
              type: "text" as const,
              text: `Loaded ${item.title}.`
            }
          ],
          _meta: {
            item
          }
        };
      })
  );

  registerAppTool(
    server,
    "get_study_snapshot",
    {
      title: "Get study snapshot",
      description:
        "Use this when the user asks for an overall status update or combines multiple questions about upcoming lectures, open tasks, grades, and learning spaces.",
      inputSchema: {
        term: z.string().min(1).optional(),
        limit: limitSchema
      },
      annotations: readOnlyAnnotations(),
      _meta: {}
    },
    async ({ term, limit }) =>
      runReadTool(async () => {
        const dashboard = await loadDashboard(term ?? defaultTerm);
        const snapshot = buildSnapshot(dashboard, limit ?? 5);
        return {
          structuredContent: snapshot,
          content: [
            {
              type: "text" as const,
              text: `Loaded a study snapshot for ${dashboard.termLabel} with ${snapshot.nextEvents.length} upcoming events, ${snapshot.openTasks.length} tasks, and ${snapshot.grades.length} recent exam rows.`
            }
          ],
          _meta: {
            snapshot
          }
        };
      })
  );

  registerAppTool(
    server,
    "get_upcoming_schedule",
    {
      title: "Get upcoming schedule",
      description:
        "Use this when the user asks about next lectures, meetings, classes, or calendar items from Alma.",
      inputSchema: {
        term: z.string().min(1).optional(),
        limit: limitSchema
      },
      annotations: readOnlyAnnotations(),
      _meta: {}
    },
    async ({ term, limit }) =>
      runReadTool(async () => {
        const timetable = await loadTimetable(term ?? defaultTerm);
        const items = timetable.occurrences.slice(0, limit ?? 5);
        return {
          structuredContent: {
            termLabel: timetable.term_label,
            exportUrl: timetable.export_url,
            items
          },
          content: [
            {
              type: "text" as const,
              text: `Loaded ${items.length} upcoming Alma schedule items for ${timetable.term_label}.`
            }
          ],
          _meta: {
            items
          }
        };
      })
  );

  registerAppTool(
    server,
    "get_current_tasks",
    {
      title: "Get current tasks",
      description:
        "Use this when the user asks about open ILIAS tasks, due items, or assignment deadlines.",
      inputSchema: {
        limit: limitSchema
      },
      annotations: readOnlyAnnotations(),
      _meta: {}
    },
    async ({ limit }) =>
      runReadTool(async () => {
        const tasks = await loadTasks(limit ?? 8);
        return {
          structuredContent: {
            tasks
          },
          content: [
            {
              type: "text" as const,
              text: `Loaded ${tasks.length} ILIAS tasks.`
            }
          ],
          _meta: {
            tasks
          }
        };
      })
  );

  registerAppTool(
    server,
    "get_current_grades",
    {
      title: "Get current grades",
      description:
        "Use this when the user asks about grades, passed exams, credits, or current Alma study progress.",
      inputSchema: {
        limit: limitSchema
      },
      annotations: readOnlyAnnotations(),
      _meta: {}
    },
    async ({ limit }) =>
      runReadTool(async () => {
        const [enrollment, exams] = await Promise.all([
          loadEnrollments(),
          loadExams(limit ?? 8)
        ]);
        const passedExamCount = exams.filter((exam) => {
          const normalizedStatus = (exam.status ?? "").trim().toUpperCase();
          const normalizedGrade = (exam.grade ?? "").trim();
          return (
            normalizedStatus === "BE" ||
            normalizedStatus === "PASSED" ||
            normalizedStatus === "BESTANDEN" ||
            (normalizedGrade !== "" && normalizedGrade !== "-" && normalizedGrade !== "5,0")
          );
        }).length;
        const trackedCredits = Number(
          exams
            .map((exam) => Number.parseFloat((exam.cp ?? "0").replace(",", ".")))
            .filter((value) => Number.isFinite(value))
            .reduce((sum, value) => sum + value, 0)
            .toFixed(1)
        );
        return {
          structuredContent: {
            study: {
              selectedTerm: enrollment.selected_term,
              message: enrollment.message,
              passedExamCount,
              trackedCredits
            },
            exams
          },
          content: [
            {
              type: "text" as const,
              text: `Loaded ${exams.length} exam rows with ${trackedCredits} tracked credits and ${passedExamCount} passed exams.`
            }
          ],
          _meta: {
            study: {
              selectedTerm: enrollment.selected_term,
              message: enrollment.message,
              passedExamCount,
              trackedCredits
            },
            exams
          }
        };
      })
  );

  registerAppTool(
    server,
    "get_learning_spaces",
    {
      title: "Get learning spaces",
      description:
        "Use this when the user asks which ILIAS courses, groups, or learning spaces they currently belong to.",
      inputSchema: {
        limit: limitSchema
      },
      annotations: readOnlyAnnotations(),
      _meta: {}
    },
    async ({ limit }) =>
      runReadTool(async () => {
        const memberships = await loadMemberships(limit ?? 8);
        return {
          structuredContent: {
            memberships
          },
          content: [
            {
              type: "text" as const,
              text: `Loaded ${memberships.length} ILIAS memberships.`
            }
          ],
          _meta: {
            memberships
          }
        };
      })
  );

  registerAppTool(
    server,
    "get_course_catalog_filters",
    {
      title: "Get course catalog filters",
      description:
        "Use this before course discovery when you need the valid Alma filter values for degrees, subjects, faculties, languages, or element types.",
      inputSchema: {},
      annotations: readOnlyAnnotations(),
      _meta: {}
    },
    async () =>
      runReadTool(async () => {
        const filters = await loadCourseCatalogFilters();
        return {
          structuredContent: asStructured(filters),
          content: [
            {
              type: "text" as const,
              text: "Loaded the current Alma course catalog filter options."
            }
          ],
          _meta: {
            filters
          }
        };
      })
  );

  registerAppTool(
    server,
    "search_courses",
    {
      title: "Search Alma course catalog",
      description:
        "Use this when the user wants course or module discovery, asks what courses fit a degree or subject, or wants options for next semester.",
      inputSchema: {
        query: z.string().optional(),
        title: z.string().optional(),
        number: z.string().optional(),
        elementType: courseFilterListSchema,
        language: courseFilterListSchema,
        degree: courseFilterListSchema,
        subject: courseFilterListSchema,
        faculty: courseFilterListSchema,
        maxResults: z.number().int().min(1).max(50).optional()
      },
      annotations: readOnlyAnnotations(),
      _meta: {}
    },
    async (params) =>
      runReadTool(async () => {
        const results = await searchCourseCatalog(params);
        return {
          structuredContent: asStructured(results),
          content: [
            {
              type: "text" as const,
              text: `Loaded ${results.returnedResults} Alma course results${results.totalResults !== null ? ` out of ${results.totalResults}` : ""}.`
            }
          ],
          _meta: {
            results
          }
        };
      })
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
    async ({ term }) =>
      runWidgetTool(async () => {
        const dashboard = await loadDashboard(term);
        return {
          structuredContent: {
            view: "dashboard",
            dashboard
          },
          content: [
            {
              type: "text" as const,
              text: `Showing the unified study dashboard for ${dashboard.termLabel}.`
            }
          ],
          _meta: {
            dashboard
          }
        };
      })
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
    async () =>
      runWidgetTool(async () => {
        const dashboard = await loadDashboard();
        const documents = dashboard.documents;
        return {
          structuredContent: {
            view: "documents",
            documents
          },
          content: [
            {
              type: "text" as const,
              text: `Loaded ${dashboard.documents.reports.length} Alma study-service document jobs.`
            }
          ],
          _meta: {
            documents
          }
        };
      })
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

  if (req.method === "GET" && url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" }).end(
      JSON.stringify({
        status: "ok",
        service: serverName,
        mcpPath: MCP_PATH
      })
    );
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
