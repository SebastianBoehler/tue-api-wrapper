import { AppShell } from "../../components/app-shell";
import { getDocuments } from "../../lib/portal-api";

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return (
    <AppShell title="Documents" kicker="Study-service paperwork">
      <section className="hero-card slim">
        <div>
          <p className="eyebrow">Certificates and proofs</p>
          <h2>Make the bureaucratic path legible</h2>
          <p className="hero-copy">
            Surface the jobs Alma already exposes, but group them where students expect them and keep the naming human.
          </p>
        </div>
      </section>

      <section className="stack">
        {documents.map((document) => (
          <article key={document.trigger_name} className="panel">
            <p className="eyebrow">Document export</p>
            <h3>{document.label}</h3>
            <p className="mono">{document.trigger_name}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
