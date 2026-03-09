import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import {
  getIliasContent,
  getIliasExercise,
  getIliasForum,
  getIliasLinks,
  PortalApiError
} from "../../lib/portal-api";

function buildSpaceHref(target: string) {
  return `/spaces?target=${encodeURIComponent(target)}`;
}

export default async function SpacesPage({
  searchParams
}: {
  searchParams?: Promise<{ target?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const target = resolvedSearchParams.target?.trim();

  if (!target) {
    try {
      const links = await getIliasLinks();
      return (
        <AppShell title="Learning Spaces" kicker="Internal ILIAS view">
          <section className="hero-card slim">
            <div>
              <p className="eyebrow">ILIAS inside the shell</p>
              <h2>Open course spaces without leaving the app</h2>
              <p className="hero-copy">
                Start from the entry points we can already read through the unofficial API, then drill down internally.
              </p>
            </div>
          </section>

          <section className="panel">
              <div className="stack">
              {links.map((link) => (
                <a key={`${link.label}-${link.url}`} href={buildSpaceHref(link.url)} className="list-row">
                  <strong>{link.label}</strong>
                  <span>Open internally</span>
                </a>
              ))}
            </div>
          </section>
        </AppShell>
      );
    } catch (error) {
      const message =
        error instanceof PortalApiError ? error.message : "The internal ILIAS space index could not load.";
      return (
        <AppShell title="Learning Spaces" kicker="Internal ILIAS view">
          <ErrorPanel title="ILIAS unavailable" message={message} />
        </AppShell>
      );
    }
  }

  try {
    const [contentResult, forumResult, exerciseResult] = await Promise.allSettled([
      getIliasContent(target),
      getIliasForum(target),
      getIliasExercise(target)
    ]);

    const content = contentResult.status === "fulfilled" ? contentResult.value : null;
    const forum = forumResult.status === "fulfilled" ? forumResult.value : [];
    const exercise = exerciseResult.status === "fulfilled" ? exerciseResult.value : [];

    if (!content && !forum.length && !exercise.length) {
      throw contentResult.status === "rejected" ? contentResult.reason : new Error("No internal ILIAS data available.");
    }

    return (
      <AppShell title="Learning Spaces" kicker="Internal ILIAS view">
        <section className="hero-card slim">
          <div>
            <p className="eyebrow">ILIAS proxy view</p>
            <h2>{content?.title ?? "Learning space"}</h2>
            <p className="hero-copy">
              Read the space structure through the wrapper first. Leave for the original page only when an action still
              requires the native interface.
            </p>
          </div>
          <div className="hero-actions">
            <Link href="/spaces" className="action-link ghost">
              Back to spaces
            </Link>
            <a href={target} className="inline-link">
              Original ILIAS page
            </a>
          </div>
        </section>

        {content?.sections.length ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Contents</p>
                <h3>Structured space contents</h3>
              </div>
            </div>
            <div className="stack">
              {content.sections.map((section) => (
                <article key={section.label} className="detail-card">
                  <p className="eyebrow">{section.label}</p>
                  <div className="stack">
                    {section.items.map((item) => (
                      <a key={`${item.label}-${item.url}`} href={buildSpaceHref(item.url)} className="list-row compact">
                        <div>
                          <strong>{item.label}</strong>
                          <p>{[item.kind, ...item.properties].filter(Boolean).join(" | ") || "ILIAS object"}</p>
                        </div>
                        <span>Open</span>
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {exercise.length ? (
          <section className="panel">
            <p className="eyebrow">Exercises</p>
            <h3>Assignment view</h3>
            <div className="stack">
              {exercise.map((item) => (
                <article key={`${item.title}-${item.url}`} className="detail-card">
                  <strong>{item.title}</strong>
                  <p>{item.due_at ?? item.due_hint ?? "No due date exposed."}</p>
                  <p>{[item.status, item.requirement, item.submission_type].filter(Boolean).join(" | ")}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {forum.length ? (
          <section className="panel">
            <p className="eyebrow">Forum</p>
            <h3>Topic list</h3>
            <div className="stack">
              {forum.map((topic) => (
                <article key={`${topic.title}-${topic.url}`} className="detail-card">
                  <strong>{topic.title}</strong>
                  <p>{[topic.author, topic.posts ? `${topic.posts} posts` : null, topic.visits ? `${topic.visits} visits` : null].filter(Boolean).join(" | ")}</p>
                  <p>{topic.last_post ?? "No last-post timestamp exposed."}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "The internal ILIAS space view could not load.";
    return (
      <AppShell title="Learning Spaces" kicker="Internal ILIAS view">
        <ErrorPanel title="ILIAS unavailable" message={message} />
      </AppShell>
    );
  }
}
