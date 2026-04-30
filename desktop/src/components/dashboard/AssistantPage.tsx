import { useEffect, useState } from "react";

import type { AssistantChatMessage, AssistantConfig, AssistantToolCallTrace, AssistantToolCard } from "../../../shared/desktop-types";
import { AssistantResultPanel } from "./AssistantResultPanel";
import { MarkdownText } from "./MarkdownText";
import type { DashboardPageProps } from "./types";

type TranscriptMessage = AssistantChatMessage & {
  toolCards?: AssistantToolCard[];
  toolCalls?: AssistantToolCallTrace[];
};

const nvidiaPreset = {
  baseUrl: "https://integrate.api.nvidia.com/v1",
  model: "stepfun-ai/step-3.5-flash"
};

export function AssistantPage({ state }: DashboardPageProps) {
  const [config, setConfig] = useState<AssistantConfig>({ baseUrl: "http://127.0.0.1:1234/v1", model: "local-model", apiKey: "" });
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.desktop.getAssistantConfig().then(setConfig).catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Could not load assistant config.");
    });
  }, []);

  async function saveConfig(nextConfig = config) {
    setSaving(true);
    setError(null);
    try {
      setConfig(await window.desktop.saveAssistantConfig(nextConfig));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save assistant config.");
    } finally {
      setSaving(false);
    }
  }

  async function send() {
    const content = input.trim();
    if (!content || loading) {
      return;
    }
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const requestMessages = nextMessages.map(({ role, content }) => ({ role, content }));
      const response = await window.desktop.sendAssistantMessage({ config, messages: requestMessages });
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: response.text,
          toolCards: response.toolCards,
          toolCalls: response.toolCalls
        }
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Assistant request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="assistant-layout">
      <section className="panel assistant-settings">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Assistant</p>
            <h3>Model endpoint</h3>
          </div>
          <button className="secondary-button compact-button" disabled={saving} onClick={() => void saveConfig()} type="button">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
        <label className="field">
          <span>Base URL</span>
          <input value={config.baseUrl} onChange={(event) => setConfig({ ...config, baseUrl: event.target.value })} />
        </label>
        <label className="field">
          <span>Model</span>
          <input value={config.model} onChange={(event) => setConfig({ ...config, model: event.target.value })} />
        </label>
        <label className="field">
          <span>API key</span>
          <input type="password" value={config.apiKey} onChange={(event) => setConfig({ ...config, apiKey: event.target.value })} />
        </label>
        <div className="button-row">
          <button className="ghost-button compact-button" onClick={() => setConfig({ ...config, baseUrl: "http://127.0.0.1:1234/v1" })} type="button">
            LM Studio
          </button>
          <button className="ghost-button compact-button" onClick={() => setConfig({ ...config, ...nvidiaPreset })} type="button">
            NVIDIA
          </button>
        </div>
        {state.backendUrl ? <p className="muted">Tools use {state.backendUrl}</p> : <p className="inline-error">Local study backend is not ready.</p>}
        {error ? <p className="inline-error">{error}</p> : null}
      </section>

      <section className="panel assistant-chat">
        <div className="assistant-transcript">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chat-turn ${message.role}`}>
              <div className={`chat-bubble ${message.role}`}>
                {message.role === "assistant" ? <MarkdownText text={message.content} /> : message.content}
              </div>
              {message.role === "assistant" ? (
                <AssistantResultPanel cards={message.toolCards ?? []} toolCalls={message.toolCalls ?? []} />
              ) : null}
            </div>
          ))}
          {messages.length === 0 ? <p className="muted empty-state">Ask about your schedule, grades, mail, talks, TIMMS videos, or people.</p> : null}
        </div>
        <div className="assistant-input-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void send()}
            placeholder="Ask your local study assistant"
          />
          <button className="primary-button" disabled={loading || !input.trim()} onClick={() => void send()} type="button">
            {loading ? "Thinking..." : "Send"}
          </button>
        </div>
      </section>
    </div>
  );
}
