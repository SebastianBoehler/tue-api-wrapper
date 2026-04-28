import { createServer } from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createAppServer, serverName } from "./study-server.js";

const port = Number(process.env.PORT ?? 8080);
const mcpPath = "/mcp";

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
        mcpPath,
      }),
    );
    return;
  }

  if (req.method === "OPTIONS" && url.pathname === mcpPath) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  const supportedMethods = new Set(["GET", "POST", "DELETE"]);
  if (req.method && supportedMethods.has(req.method) && url.pathname === mcpPath) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const appServer = createAppServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
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
  console.log(`TUE Study Hub MCP server listening on http://localhost:${port}${mcpPath}`);
});
