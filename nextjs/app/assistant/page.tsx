import { AppShell } from "../../components/app-shell";

const prompts = [
  "Show me the next machine learning events from Alma.",
  "Find the study-service document for an enrollment certificate.",
  "Search the unified portal for ethics or philosophy materials.",
  "Summarize what I should check in ILIAS this week."
];

export default function AssistantPage() {
  return (
    <AppShell title="Assistant" kicker="ChatGPT companion">
      <section className="hero-card slim">
        <div>
          <p className="eyebrow">Companion surface</p>
          <h2>Pair the dashboard with a ChatGPT app</h2>
          <p className="hero-copy">
            The `chatgpt/` app uses the same unified portal model, so the assistant can search, fetch, and render a compact study snapshot inside ChatGPT.
          </p>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <p className="eyebrow">Best use</p>
          <h3>Ask for synthesis, not raw clicks</h3>
          <p>
            Let the web app handle browsing and routine wayfinding. Use the ChatGPT app for summarization, cross-checking, and “what matters next?” questions.
          </p>
        </article>

        <article className="panel">
          <p className="eyebrow">Suggested prompts</p>
          <div className="stack">
            {prompts.map((prompt) => (
              <code key={prompt} className="prompt-chip">
                {prompt}
              </code>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
