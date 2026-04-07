import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  loadCourseCatalogFilters,
  loadCourseDetail,
  loadStudyPlanner,
  searchCourseCatalog,
  searchCourseOfferings,
} from "../backend.js";
import {
  asStructured,
  courseFilterListSchema,
  readOnlyAnnotations,
  runReadTool,
} from "../tool-runtime.js";

export function registerCourseTools(server: McpServer) {
  registerAppTool(
    server,
    "get_course_catalog_filters",
    {
      title: "Get module catalog filters",
      description:
        "Use this before module discovery when you need the valid Alma filter values for degrees, subjects, faculties, languages, or element types.",
      inputSchema: {},
      annotations: readOnlyAnnotations(),
      _meta: {},
    },
    async () =>
      runReadTool(async () => {
        const filters = await loadCourseCatalogFilters();
        return {
          structuredContent: asStructured(filters),
          content: [
            {
              type: "text" as const,
              text: "Loaded the current Alma module catalog filter options.",
            },
          ],
          _meta: {
            filters,
          },
        };
      }),
  );

  registerAppTool(
    server,
    "search_courses",
    {
      title: "Search public Alma module catalog",
      description:
        "Use this when the user wants public module descriptions filtered by degree, subject, faculty, language, or element type.",
      inputSchema: {
        query: z.string().optional(),
        title: z.string().optional(),
        number: z.string().optional(),
        elementType: courseFilterListSchema,
        language: courseFilterListSchema,
        degree: courseFilterListSchema,
        subject: courseFilterListSchema,
        faculty: courseFilterListSchema,
        maxResults: z.number().int().min(1).max(50).optional(),
      },
      annotations: readOnlyAnnotations(),
      _meta: {},
    },
    async (params) =>
      runReadTool(async () => {
        const results = await searchCourseCatalog(params);
        return {
          structuredContent: asStructured(results),
          content: [
            {
              type: "text" as const,
              text: `Loaded ${results.returnedResults} public Alma module results${results.totalResults !== null ? ` out of ${results.totalResults}` : ""}.`,
            },
          ],
          _meta: {
            results,
          },
        };
      }),
  );

  registerAppTool(
    server,
    "search_course_offerings",
    {
      title: "Search authenticated Alma course offerings",
      description:
        "Use this when the user wants live Alma course offerings for a term, such as current or upcoming lectures and searchable course detail URLs.",
      inputSchema: {
        query: z.string().optional(),
        term: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
      annotations: readOnlyAnnotations(),
      _meta: {},
    },
    async ({ query, term, limit }) =>
      runReadTool(async () => {
        const results = await searchCourseOfferings({ query, term, limit });
        return {
          structuredContent: asStructured(results),
          content: [
            {
              type: "text" as const,
              text: `Loaded ${results.results.length} authenticated Alma course offerings for "${results.query}".`,
            },
          ],
          _meta: {
            results,
          },
        };
      }),
  );

  registerAppTool(
    server,
    "get_course_detail",
    {
      title: "Get Alma course detail",
      description:
        "Use this when the user already has an Alma detail URL and wants the structured sections for that course or module page.",
      inputSchema: {
        url: z.string().url(),
      },
      annotations: readOnlyAnnotations(),
      _meta: {},
    },
    async ({ url }) =>
      runReadTool(async () => {
        const detail = await loadCourseDetail(url);
        return {
          structuredContent: asStructured(detail),
          content: [
            {
              type: "text" as const,
              text: `Loaded Alma course detail for ${detail.title}.`,
            },
          ],
          _meta: {
            detail,
          },
        };
      }),
  );

  registerAppTool(
    server,
    "get_study_planner",
    {
      title: "Get Alma study planner",
      description:
        "Use this when the user wants the semester grid, recommended plan, or current module layout from Alma's study planner.",
      inputSchema: {},
      annotations: readOnlyAnnotations(),
      _meta: {},
    },
    async () =>
      runReadTool(async () => {
        const planner = await loadStudyPlanner();
        return {
          structuredContent: asStructured(planner),
          content: [
            {
              type: "text" as const,
              text: `Loaded the Alma study planner with ${planner.modules.length} visible modules across ${planner.semesters.length} semesters.`,
            },
          ],
          _meta: {
            planner,
          },
        };
      }),
  );
}
