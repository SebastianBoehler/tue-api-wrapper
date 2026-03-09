import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { CourseDiscovery } from "../../components/course-discovery";
import { ErrorPanel } from "../../components/error-panel";
import {
  buildPortalApiUrl,
  getIliasLinks,
  getModuleSearchFilters,
  PortalApiError
} from "../../lib/portal-api";

export default async function CoursesPage() {
  try {
    const [filtersResult, iliasResult] = await Promise.allSettled([
      getModuleSearchFilters(),
      getIliasLinks()
    ]);

    if (filtersResult.status === "rejected") {
      throw filtersResult.reason;
    }

    const iliasLinks = iliasResult.status === "fulfilled" ? iliasResult.value : [];

    return (
      <AppShell title="Courses" kicker="Public Alma search">
        <CourseDiscovery
          apiBaseUrl={buildPortalApiUrl("")}
          filters={filtersResult.value.filters}
          sourcePageUrl={filtersResult.value.sourcePageUrl}
        />

        {iliasLinks.length ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ILIAS</p>
                <h3>Keep course discovery and course spaces close together</h3>
              </div>
            </div>
            <div className="stack">
              {iliasLinks.map((link) => (
                <Link key={`${link.label}-${link.url}`} href={`/spaces?target=${encodeURIComponent(link.url)}`} className="list-row">
                  <strong>{link.label}</strong>
                  <span>Open internally</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </AppShell>
    );
  } catch (error) {
    const message =
      error instanceof PortalApiError ? error.message : "The public Alma course discovery view could not load.";
    return (
      <AppShell title="Courses" kicker="Public Alma search">
        <ErrorPanel title="Course discovery unavailable" message={message} />
      </AppShell>
    );
  }
}
