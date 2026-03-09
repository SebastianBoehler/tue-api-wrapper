import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { getDashboard, PortalApiError } from "../../lib/portal-api";

export default async function AgendaPage() {
  try {
    const dashboard = await getDashboard();

    return (
      <AppShell title="Agenda" kicker="Calendar-first view">
        <section className="hero-card slim">
          <div>
            <p className="eyebrow">Unified weekly rhythm</p>
            <h2>Schedule without the Alma maze</h2>
            <p className="hero-copy">
              The same data, reframed as a clean agenda. Keep Alma as the source of truth and strip away the navigation noise.
            </p>
          </div>
        </section>

        <section className="stack">
          {dashboard.agenda.items.map((item) => (
            <article key={`${item.summary}-${item.start}`} className="agenda-card">
              <time className="agenda-time">
                {new Intl.DateTimeFormat("de-DE", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit"
                }).format(new Date(item.start))}
              </time>
              <div>
                <h3>{item.summary}</h3>
                <p>{item.description ?? "No description provided."}</p>
              </div>
              <span>{item.location ?? "Location pending"}</span>
            </article>
          ))}
        </section>
      </AppShell>
    );
  } catch (error) {
    const message =
      error instanceof PortalApiError ? error.message : "The agenda could not load live Alma data.";
    return (
      <AppShell title="Agenda" kicker="Calendar-first view">
        <ErrorPanel title="Agenda unavailable" message={message} />
      </AppShell>
    );
  }
}
