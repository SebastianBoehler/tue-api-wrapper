import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerWidgetResources } from "./widget-resources.js";
import { registerActionTools } from "./tools/action-tools.js";
import { registerCampusTools } from "./tools/campus-tools.js";
import { registerCourseTools } from "./tools/course-tools.js";
import { registerIliasTools } from "./tools/ilias-tools.js";
import { registerMailTools } from "./tools/mail-tools.js";
import { registerSearchTools } from "./tools/search-tools.js";
import { registerStudyTools } from "./tools/study-tools.js";
import { registerWidgetTools } from "./tools/widget-tools.js";

export const serverName = "tue-study-hub";
const enableMailTools = process.env.CHATGPT_ENABLE_MAIL_TOOLS !== "false";

export function createAppServer() {
  const server = new McpServer({ name: serverName, version: "0.5.0" });

  registerWidgetResources(server);
  registerSearchTools(server);
  registerStudyTools(server);
  registerCampusTools(server);
  registerCourseTools(server);
  registerIliasTools(server);
  if (enableMailTools) {
    registerMailTools(server);
  }
  registerWidgetTools(server);
  registerActionTools(server);

  return server;
}
