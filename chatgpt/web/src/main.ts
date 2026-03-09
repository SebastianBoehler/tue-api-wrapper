import "./styles.css";
import type { DashboardPayload } from "../../src/types.js";

type WidgetResult =
  | {
      view: "dashboard";
      dashboard: DashboardPayload;
    }
  | {
      view: "documents";
      documents: Array<{
        label: string;
        trigger_name: string;
      }>;
    }
  | null;

declare global {
  interface Window {
    openai?: {
      toolOutput?: WidgetResult;
      sendFollowUpMessage?: (args: {
        prompt: string;
        scrollToBottom?: boolean;
      }) => Promise<void>;
    };
  }
}

function escapeHtml(value: string | null | undefined): string {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function postFollowUp(prompt: string) {
  if (window.openai?.sendFollowUpMessage) {
    void window.openai.sendFollowUpMessage({ prompt });
    return;
  }

  window.parent.postMessage(
    {
      jsonrpc: "2.0",
      id: `follow-up-${Date.now()}`,
      method: "ui/message",
      params: { prompt }
    },
    "*"
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function renderDashboard(dashboard: DashboardPayload): string {
  const metrics = dashboard.metrics
    .map(
      (metric) => `
        <article class="metric-card">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${metric.value}</strong>
        </article>
      `
    )
    .join("");

  const agenda = dashboard.agenda.items
    .map(
      (item) => `
        <div class="widget-row">
          <div>
            <strong>${escapeHtml(item.summary)}</strong>
            <p>${escapeHtml(item.location ?? "Location pending")}</p>
          </div>
          <time>${escapeHtml(formatDate(item.start))}</time>
        </div>
      `
    )
    .join("");

  const documents = dashboard.documents
    .map(
      (item) => `
        <div class="widget-row compact">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.trigger_name)}</span>
        </div>
      `
    )
    .join("");

  const exams = dashboard.exams
    .map(
      (item) => `
        <div class="widget-row compact">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.number ?? "Unnumbered")}</p>
          </div>
          <span>${escapeHtml(item.grade ?? item.status ?? "-")}</span>
        </div>
      `
    )
    .join("");

  const links = [...dashboard.ilias.mainbarLinks, ...dashboard.ilias.topCategories]
    .map(
      (item) => `
        <a class="widget-row" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
          <strong>${escapeHtml(item.label)}</strong>
          <span>Open</span>
        </a>
      `
    )
    .join("");

  return `
    <div class="widget-stack">
      <header class="widget-hero">
        <div>
          <p class="widget-kicker">${escapeHtml(dashboard.termLabel)}</p>
          <h1>${escapeHtml(dashboard.hero.title)}</h1>
          <p>${escapeHtml(dashboard.hero.subtitle)}</p>
        </div>
        <button class="widget-button ghost" data-follow-up="Summarize the most urgent things in this study dashboard.">
          Summarize
        </button>
      </header>

      <section class="metric-row">${metrics}</section>

      <section class="widget-grid">
        <article class="widget-card">
          <div class="widget-card-header">
            <div>
              <p class="widget-kicker">Agenda</p>
              <h2>Upcoming events</h2>
            </div>
            <a href="${escapeHtml(dashboard.agenda.exportUrl)}" target="_blank" rel="noreferrer">Alma</a>
          </div>
          <div class="widget-list">${agenda}</div>
        </article>

        <article class="widget-card">
          <div class="widget-card-header">
            <div>
              <p class="widget-kicker">Documents</p>
              <h2>Study service</h2>
            </div>
            <button class="widget-button" data-follow-up="List the study-service document options from Alma.">Ask</button>
          </div>
          <div class="widget-list">${documents}</div>
        </article>

        <article class="widget-card">
          <div class="widget-card-header">
            <div>
              <p class="widget-kicker">Exams</p>
              <h2>Status snapshot</h2>
            </div>
          </div>
          <div class="widget-list">${exams}</div>
        </article>

        <article class="widget-card">
          <div class="widget-card-header">
            <div>
              <p class="widget-kicker">ILIAS</p>
              <h2>Fast links</h2>
            </div>
          </div>
          <div class="widget-list">${links}</div>
        </article>
      </section>
    </div>
  `;
}

function renderDocuments(
  documents: Array<{
    label: string;
    trigger_name: string;
  }>
): string {
  return `
    <div class="widget-stack">
      <header class="widget-hero">
        <div>
          <p class="widget-kicker">Documents</p>
          <h1>Study-service exports</h1>
          <p>Keep the bureaucratic options visible without forcing the user back through Alma navigation.</p>
        </div>
      </header>
      <section class="widget-card">
        <div class="widget-list">
          ${documents
            .map(
              (item) => `
                <div class="widget-row compact">
                  <strong>${escapeHtml(item.label)}</strong>
                  <span>${escapeHtml(item.trigger_name)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function bindActions(root: HTMLElement) {
  root.querySelectorAll<HTMLButtonElement>("[data-follow-up]").forEach((button) => {
    button.onclick = () => {
      const prompt = button.dataset.followUp;
      if (prompt) {
        postFollowUp(prompt);
      }
    };
  });
}

function render(result: WidgetResult) {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Missing root element");
  }

  if (!result) {
    root.innerHTML = `
      <div class="widget-empty">
        <p class="widget-kicker">Study Hub</p>
        <h1>Waiting for data</h1>
        <p>Call the dashboard tool to populate this view.</p>
      </div>
    `;
    return;
  }

  root.innerHTML =
    result.view === "documents"
      ? renderDocuments(result.documents)
      : renderDashboard(result.dashboard);
  bindActions(root);
}

window.addEventListener(
  "message",
  (event) => {
    if (event.source !== window.parent) {
      return;
    }

    const message = event.data;
    if (!message || message.jsonrpc !== "2.0") {
      return;
    }

    if (message.method !== "ui/notifications/tool-result") {
      return;
    }

    render(message.params?.structuredContent ?? null);
  },
  { passive: true }
);

render(window.openai?.toolOutput ?? null);
