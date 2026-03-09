import { AppShell } from "../../components/app-shell";
import { getIliasLinks } from "../../lib/portal-api";

export default async function CoursesPage() {
  const links = await getIliasLinks();

  return (
    <AppShell title="Courses" kicker="ILIAS navigation">
      <section className="hero-card slim">
        <div>
          <p className="eyebrow">ILIAS, simplified</p>
          <h2>Direct entry instead of breadcrumb archaeology</h2>
          <p className="hero-copy">
            Treat the learning platform as a collection of destinations, not a nested tree you have to rediscover every day.
          </p>
        </div>
      </section>

      <section className="content-grid single">
        {links.map((link) => (
          <a key={`${link.label}-${link.url}`} href={link.url} className="panel link-panel">
            <p className="eyebrow">Course space</p>
            <h3>{link.label}</h3>
            <span className="inline-link">Open in ILIAS</span>
          </a>
        ))}
      </section>
    </AppShell>
  );
}
