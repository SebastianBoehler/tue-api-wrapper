import "./action-confirmation.css";

import type { CriticalActionPublicIntent, CriticalActionResult, CriticalActionView } from "../../src/types/actions.js";

type EscapeHtml = (value: string | null | undefined) => string;

interface ActionToolResult {
  status: "completed";
  intent: CriticalActionPublicIntent;
  result: CriticalActionResult;
}

interface ActionMetadata {
  confirmationToken?: string;
}

interface ActionOpenAIHost {
  callTool?: <T = unknown>(name: string, args?: Record<string, unknown>) => Promise<{
    structuredContent?: T;
    content?: Array<{ type: string; text?: string }>;
    _meta?: Record<string, unknown>;
  }>;
  requestClose?: () => Promise<void>;
  notifyIntrinsicHeight?: (height?: number) => void;
}

type ActionRenderResult = CriticalActionView | ActionToolResult | { error: string } | null;

let currentResult: ActionRenderResult = null;
let confirmationToken = "";
let isSubmitting = false;

function host(): ActionOpenAIHost | undefined {
  return (window as typeof window & { openai?: ActionOpenAIHost }).openai;
}

export function isCriticalActionView(value: unknown): value is CriticalActionView {
  return Boolean(value && typeof value === "object" && "view" in value && (value as { view?: unknown }).view === "critical-action");
}

export function renderActionTemplate(
  root: HTMLElement,
  result: ActionRenderResult,
  metadata: ActionMetadata | undefined,
  escapeHtml: EscapeHtml,
) {
  currentResult = result;
  confirmationToken = metadata?.confirmationToken ?? confirmationToken;

  if (isActionToolResult(result)) {
    root.innerHTML = renderCompleted(result, escapeHtml);
  } else if (isCriticalActionView(result)) {
    root.innerHTML = renderConfirmation(result.intent, escapeHtml);
  } else if (result?.error) {
    root.innerHTML = renderError(result.error, escapeHtml);
  } else {
    root.innerHTML = renderError("No action intent was provided to this confirmation view.", escapeHtml);
  }

  bindActionHandlers(root, escapeHtml);
  host()?.notifyIntrinsicHeight?.();
}

function isActionToolResult(value: ActionRenderResult): value is ActionToolResult {
  return Boolean(value && typeof value === "object" && "status" in value && value.status === "completed");
}

function renderConfirmation(intent: CriticalActionPublicIntent, escapeHtml: EscapeHtml): string {
  return `
    <div class="widget-stack action-shell">
      <header class="widget-hero action-hero">
        <div>
          <p class="widget-kicker">Human approval required</p>
          <h1>${escapeHtml(intent.actionLabel)}</h1>
          <p>${escapeHtml(intent.title)}</p>
        </div>
        <span class="action-chip">${escapeHtml(intent.portal)}</span>
      </header>

      <section class="widget-card widget-card-wide action-card">
        <div class="widget-card-header">
          <div>
            <p class="widget-kicker">Action intent</p>
            <h2>Nothing has been submitted yet</h2>
          </div>
          <span>${escapeHtml(intent.method)} ${escapeHtml(intent.endpoint)}</span>
        </div>

        <div class="action-facts">
          <div>
            <span>Target</span>
            <strong>${escapeHtml(intent.title)}</strong>
          </div>
          <div>
            <span>Prepared</span>
            <strong>${escapeHtml(formatTimestamp(intent.preparedAt))}</strong>
          </div>
          <div>
            <span>Expires</span>
            <strong>${escapeHtml(formatTimestamp(intent.expiresAt))}</strong>
          </div>
        </div>

        ${intent.targetUrl ? `<p class="action-url">${escapeHtml(intent.targetUrl)}</p>` : ""}

        <div class="action-section">
          <h3>What Proceed will do</h3>
          <ul>
            ${intent.sideEffects.map((effect) => `<li>${escapeHtml(effect)}</li>`).join("")}
          </ul>
        </div>

        ${
          intent.requiredInputs.length
            ? `
              <div class="action-section">
                <h3>Required inputs</h3>
                <ul>${intent.requiredInputs.map((input) => `<li>${escapeHtml(input)}</li>`).join("")}</ul>
              </div>
            `
            : ""
        }

        <div class="action-controls">
          <button class="widget-button danger" data-action="proceed-critical-action" ${isSubmitting ? "disabled" : ""}>
            ${isSubmitting ? "Submitting..." : "Proceed"}
          </button>
          <button class="widget-button ghost" data-action="cancel-critical-action" ${isSubmitting ? "disabled" : ""}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderCompleted(result: ActionToolResult, escapeHtml: EscapeHtml): string {
  return `
    <div class="widget-stack action-shell">
      <header class="widget-hero">
        <div>
          <p class="widget-kicker">Action complete</p>
          <h1>${escapeHtml(result.intent.actionLabel)}</h1>
          <p>${escapeHtml(result.result.message ?? `Finished with status ${result.result.status}.`)}</p>
        </div>
        <button class="widget-button ghost" data-action="close-action">Close</button>
      </header>
      <section class="widget-card widget-card-wide">
        <div class="action-facts">
          <div>
            <span>Status</span>
            <strong>${escapeHtml(result.result.status)}</strong>
          </div>
          <div>
            <span>Portal</span>
            <strong>${escapeHtml(result.intent.portal)}</strong>
          </div>
        </div>
        ${result.result.finalUrl ? `<p class="action-url">${escapeHtml(result.result.finalUrl)}</p>` : ""}
      </section>
    </div>
  `;
}

function renderCancelled(escapeHtml: EscapeHtml): string {
  return `
    <div class="widget-empty">
      <p class="widget-kicker">Cancelled</p>
      <h1>No action was submitted</h1>
      <p>${escapeHtml("The prepared action was discarded locally. Upstream university state was not changed.")}</p>
    </div>
  `;
}

function renderError(message: string, escapeHtml: EscapeHtml): string {
  return `
    <div class="widget-empty">
      <p class="widget-kicker">Action unavailable</p>
      <h1>Confirmation failed</h1>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function bindActionHandlers(root: HTMLElement, escapeHtml: EscapeHtml) {
  root.onclick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const actionTarget = target.closest<HTMLElement>("[data-action]");
    if (!actionTarget?.dataset.action) {
      return;
    }
    event.preventDefault();
    void handleAction(actionTarget.dataset.action, root, escapeHtml);
  };
}

async function handleAction(action: string, root: HTMLElement, escapeHtml: EscapeHtml) {
  if (action === "cancel-critical-action") {
    root.innerHTML = renderCancelled(escapeHtml);
    host()?.notifyIntrinsicHeight?.();
    return;
  }

  if (action === "close-action") {
    if (host()?.requestClose) {
      await host()?.requestClose?.();
    }
    return;
  }

  if (action !== "proceed-critical-action" || !isCriticalActionView(currentResult)) {
    return;
  }

  if (!confirmationToken) {
    root.innerHTML = renderError("The confirmation token is missing. Prepare the action again.", escapeHtml);
    return;
  }

  isSubmitting = true;
  renderActionTemplate(root, currentResult, { confirmationToken }, escapeHtml);

  try {
    const response = await host()?.callTool?.<ActionToolResult>("confirm_critical_action", {
      intentId: currentResult.intent.id,
      confirmationToken,
    });
    currentResult = response?.structuredContent ?? { error: "The backend did not return an action result." };
  } catch (error) {
    currentResult = { error: error instanceof Error ? error.message : "The action could not be submitted." };
  } finally {
    isSubmitting = false;
    confirmationToken = "";
    renderActionTemplate(root, currentResult, undefined, escapeHtml);
  }
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
