import "./styles.css";
import type { DashboardPayload } from "../../src/types.js";

type WidgetResult =
  | {
      view: "dashboard";
      dashboard: DashboardPayload;
    }
  | {
      view: "documents";
      documents: DashboardPayload["documents"];
    }
  | {
      view: "error";
      message: string;
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

function renderFallbackRow(message: string): string {
  return `
    <div class="widget-row compact">
      <strong>${escapeHtml(message)}</strong>
    </div>
  `;
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

  const agenda = (dashboard.agenda.items.length ? dashboard.agenda.items : [])
    .slice(0, 5)
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
    .join("") || renderFallbackRow("No upcoming Alma events found.");

  const documents = dashboard.documents.reports
    .slice(0, 4)
    .map(
      (item) => `
        <div class="widget-row compact">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.trigger_name)}</span>
        </div>
      `
    )
    .join("") || renderFallbackRow("No Alma document jobs available.");

  const exams = dashboard.exams
    .slice(0, 4)
    .map(
      (item) => `
        <div class="widget-row compact">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.number ?? item.status ?? "Status pending")}</p>
          </div>
          <span>${escapeHtml(item.grade ?? item.cp ?? item.status ?? "-")}</span>
        </div>
      `
    )
    .join("") || renderFallbackRow("No Alma exam rows found.");

  const tasks = dashboard.ilias.tasks
    .slice(0, 5)
    .map(
      (item) => `
        <a class="widget-row compact" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.item_type ?? "Task")}</p>
          </div>
          <span>${escapeHtml(item.end ?? item.start ?? "-")}</span>
        </a>
      `
    )
    .join("") || renderFallbackRow("No open ILIAS tasks found.");

  const memberships = dashboard.ilias.memberships
    .slice(0, 4)
    .map(
      (item) => `
        <a class="widget-row compact" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.description ?? item.properties[0] ?? item.kind ?? "Learning space")}</p>
          </div>
          <span>${escapeHtml(item.kind ?? "Open")}</span>
        </a>
      `
    )
    .join("") || renderFallbackRow("No current ILIAS memberships found.");

  const studySummary = `
    <div class="widget-summary">
      <div>
        <span>Tracked credits</span>
        <strong>${dashboard.study.trackedCredits}</strong>
      </div>
      <div>
        <span>Passed exams</span>
        <strong>${dashboard.study.passedExamCount}</strong>
      </div>
      <div>
        <span>Term</span>
        <strong>${escapeHtml(dashboard.study.selectedTerm ?? dashboard.termLabel)}</strong>
      </div>
    </div>
  `;

  const quickActions = [
    "What should I focus on this week based on my schedule, tasks, and grades?",
    "List my next lectures and meetings.",
    "Summarize my current grades and credits.",
    "Suggest courses for next semester based on my current study progress."
  ]
    .map(
      (prompt) => `
        <button class="widget-button ghost" data-follow-up="${escapeHtml(prompt)}">
          ${escapeHtml(prompt)}
        </button>
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
              <p class="widget-kicker">Tasks</p>
              <h2>Open ILIAS work</h2>
            </div>
            <button class="widget-button" data-follow-up="List my open ILIAS tasks with the nearest deadlines.">
              Ask
            </button>
          </div>
          <div class="widget-list">${tasks}</div>
        </article>

        <article class="widget-card">
          <div class="widget-card-header">
            <div>
              <p class="widget-kicker">Progress</p>
              <h2>Study status</h2>
            </div>
          </div>
          ${studySummary}
          <div class="widget-list">${exams}</div>
        </article>

        <article class="widget-card">
          <div class="widget-card-header">
            <div>
              <p class="widget-kicker">Spaces</p>
              <h2>Learning spaces</h2>
            </div>
            <button class="widget-button ghost" data-follow-up="List my current learning spaces and what each one is for.">
              Ask
            </button>
          </div>
          <div class="widget-list">${memberships}</div>
        </article>

        <article class="widget-card">
          <div class="widget-card-header">
            <div>
              <p class="widget-kicker">Documents</p>
              <h2>Study service</h2>
            </div>
            <button class="widget-button" data-follow-up="List the study-service document options from Alma.">
              Ask
            </button>
          </div>
          <div class="widget-list">${documents}</div>
        </article>

        <article class="widget-card">
          <div class="widget-card-header">
            <div>
              <p class="widget-kicker">Assistant</p>
              <h2>Ask next</h2>
            </div>
          </div>
          <div class="widget-actions">${quickActions}</div>
        </article>
      </section>
    </div>
  `;
}

function renderDocuments(
  documents: DashboardPayload["documents"]
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
      ${
        documents.currentDownloadUrl
          ? `
            <section class="widget-card">
              <div class="widget-card-header">
                <div>
                  <p class="widget-kicker">Live download</p>
                  <h2>Current Alma PDF</h2>
                </div>
                <a href="${escapeHtml(documents.currentDownloadUrl)}" target="_blank" rel="noreferrer">
                  Download
                </a>
              </div>
            </section>
          `
          : ""
      }
      <section class="widget-card">
        <div class="widget-list">
          ${documents.reports
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

function renderError(message: string): string {
  return `
    <div class="widget-empty">
      <p class="widget-kicker">Live data required</p>
      <h1>Backend unavailable</h1>
      <p>${escapeHtml(message)}</p>
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
      : result.view === "error"
        ? renderError(result.message)
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
