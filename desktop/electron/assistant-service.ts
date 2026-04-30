import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantToolCallTrace,
  AssistantToolCard
} from "../shared/desktop-types";
import { BackendManager } from "./backend-manager";

type LlmMessage = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_call_id?: string; tool_calls?: ToolCall[] };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export class AssistantService {
  constructor(private readonly manager: BackendManager) {}

  async chat(request: AssistantChatRequest): Promise<AssistantChatResponse> {
    const config = normalizeConfig(request.config);
    const endpoint = `${config.baseUrl}/chat/completions`;
    const messages: LlmMessage[] = [
      { role: "system", content: systemPrompt },
      ...request.messages.slice(-12).map((item) => ({ role: item.role, content: item.content }))
    ];

    const first = await callModel(endpoint, config, messages, true);
    const choice = first.choices?.[0]?.message;
    const cards: AssistantToolCard[] = [];
    const traces: AssistantToolCallTrace[] = [];
    if (!choice?.tool_calls?.length) {
      return { text: choice?.content ?? "", toolCards: cards, toolCalls: traces };
    }

    messages.push({ role: "assistant", content: choice.content ?? "", tool_calls: choice.tool_calls });
    for (const call of choice.tool_calls) {
      const args = safeArgs(call.function.arguments);
      try {
        const card = await this.runTool(call.function.name, args);
        cards.push(card);
        traces.push(trace(call, args, "success", card.title, card.summary));
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(card.data) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Tool call failed.";
        traces.push(trace(call, args, "error", toolTitle(call.function.name), message));
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: message }) });
      }
    }

    const final = await callModel(endpoint, config, messages, false);
    return { text: final.choices?.[0]?.message?.content ?? "", toolCards: cards, toolCalls: traces };
  }

  private async runTool(name: string, args: Record<string, unknown>): Promise<AssistantToolCard> {
    const backendUrl = this.manager.getState().backendUrl;
    if (!backendUrl) {
      throw new Error("The local study backend is not ready.");
    }
    switch (name) {
      case "get_study_snapshot":
        return card("get_study_snapshot", "Study snapshot", await getJson(`${backendUrl}/api/dashboard?include_course_assignments=false`));
      case "search_talks":
        return card("search_talks", "Talks", await getJson(`${backendUrl}/api/talks?query=${encodeURIComponent(String(args.query ?? ""))}&limit=8`));
      case "search_timms":
        return card("search_timms", "TIMMS archive", await getJson(`${backendUrl}/api/timms/search?query=${encodeURIComponent(String(args.query ?? ""))}&limit=6`));
      case "search_people":
        return card("search_people", "People", await getJson(`${backendUrl}/api/people/search?query=${encodeURIComponent(String(args.query ?? ""))}`));
      case "search_mail":
        return card("search_mail", "Mail", await getJson(`${backendUrl}/api/mail/inbox?limit=8&query=${encodeURIComponent(String(args.query ?? ""))}&unread_only=${Boolean(args.unreadOnly)}`));
      default:
        throw new Error(`Unsupported assistant tool '${name}'.`);
    }
  }
}

const systemPrompt = [
  "You are the local TUE Study Hub desktop assistant.",
  "Use tools when the user asks about schedule, grades, mail, talks, TIMMS videos, or university people.",
  "Keep answers concise and reference tool results. Do not ask for passwords or secrets.",
  "The app renders structured UI cards from tool results, so summarize the findings instead of duplicating every row."
].join(" ");

const tools = [
  tool("get_study_snapshot", "Load current dashboard data including schedule, exams, study, mail, and learning status.", {}),
  tool("search_talks", "Search public university talks.", { query: { type: "string" } }),
  tool("search_timms", "Search TIMMS lecture archive videos.", { query: { type: "string" } }),
  tool("search_people", "Search the public university people directory.", { query: { type: "string" } }),
  tool("search_mail", "Search the local mailbox summary.", { query: { type: "string" }, unreadOnly: { type: "boolean" } })
];

async function callModel(endpoint: string, config: { model: string; apiKey: string; baseUrl: string }, messages: LlmMessage[], includeTools: boolean) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.4,
      stream: false,
      ...(includeTools ? { tools, tool_choice: "auto" } : {})
    })
  });
  if (!response.ok) {
    throw new Error(await response.text().catch(() => `Assistant request failed with ${response.status}.`));
  }
  return response.json() as Promise<{ choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[] }>;
}

function tool(name: string, description: string, properties: Record<string, unknown>) {
  return { type: "function", function: { name, description, parameters: { type: "object", properties } } };
}

function normalizeConfig(config: AssistantChatRequest["config"]) {
  return { ...config, baseUrl: config.baseUrl.trim().replace(/\/+$/, ""), model: config.model.trim() };
}

function safeArgs(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await response.text().catch(() => `Tool request failed with ${response.status}.`));
  }
  return response.json();
}

function card(name: string, title: string, data: unknown): AssistantToolCard {
  return { name, title, summary: summarize(data), data };
}

function trace(
  call: ToolCall,
  args: Record<string, unknown>,
  status: AssistantToolCallTrace["status"],
  title: string,
  summary: string
): AssistantToolCallTrace {
  return { id: call.id, name: call.function.name, title, arguments: args, status, summary };
}

function toolTitle(name: string): string {
  return tools.find((item) => item.function.name === name)?.function.description ?? name;
}

function summarize(data: unknown): string {
  if (Array.isArray(data)) {
    return `${data.length} items`;
  }
  if (data && typeof data === "object") {
    const keys = Object.keys(data as Record<string, unknown>).slice(0, 4);
    return keys.length ? keys.join(", ") : "Loaded";
  }
  return "Loaded";
}
