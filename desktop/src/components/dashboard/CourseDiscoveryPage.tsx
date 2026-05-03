import type { CourseDiscoveryResult } from "../../lib/course-discovery-types";
import type { CourseDiscoveryPageProps } from "./types";

const SOURCE_OPTIONS = [
  { id: "alma", label: "Alma" },
  { id: "ilias", label: "ILIAS" },
  { id: "moodle", label: "Moodle" }
];

export function CourseDiscoveryPage({
  discovery,
  discoveryError,
  discoveryLoading,
  onSearchDiscovery,
  setDiscoveryIncludePrivate,
  setDiscoveryQuery,
  setDiscoverySources
}: CourseDiscoveryPageProps) {
  const results = discovery.response?.results ?? [];
  const status = discovery.status ?? discovery.response?.status;

  return (
    <div className="course-discovery-layout">
      <section className="panel course-discovery-search">
        <div className="section-heading">
          <h3>Course discovery</h3>
          <span>{status ? `${status.document_count} indexed` : "Local index"}</span>
        </div>
        <div className="field">
          <span>Search</span>
          <input
            className="search-input"
            onChange={(event) => setDiscoveryQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" ? void onSearchDiscovery() : undefined}
            placeholder="Course, module, topic, lecturer"
            value={discovery.query}
          />
        </div>
        <div className="source-toggle-list">
          {SOURCE_OPTIONS.map((source) => (
            <label key={source.id} className="check-row">
              <input
                checked={discovery.sources.includes(source.id)}
                onChange={() => setDiscoverySources(toggle(discovery.sources, source.id))}
                type="checkbox"
              />
              <span>{source.label}</span>
            </label>
          ))}
        </div>
        <label className="check-row">
          <input
            checked={discovery.includePrivate}
            onChange={(event) => setDiscoveryIncludePrivate(event.target.checked)}
            type="checkbox"
          />
          <span>Include authenticated local sources</span>
        </label>
        <button
          className="primary-button full-width"
          disabled={discoveryLoading || !discovery.query.trim()}
          onClick={() => void onSearchDiscovery()}
          type="button"
        >
          {discoveryLoading ? "Searching..." : "Search courses"}
        </button>
        {status ? (
          <p className="form-note">
            {status.semantic_available
              ? `Semantic search via ${status.vector_store} and ${status.embedding_model}.`
              : "Semantic search is local-only and currently disabled."}
          </p>
        ) : null}
        {discoveryError ? <p className="inline-error">{discoveryError}</p> : null}
        {discovery.response?.errors.map((error) => <p key={error} className="inline-error">{error}</p>)}
      </section>

      <section className="panel course-discovery-results">
        <div className="section-heading">
          <h3>Results</h3>
          <span>{results.length} matches</span>
        </div>
        <div className="discovery-result-list">
          {results.map((result) => <DiscoveryResultRow key={result.document.id} result={result} />)}
          {!results.length ? (
            <p className="muted">Search Alma modules publicly, then opt into authenticated local sources when needed.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function DiscoveryResultRow({ result }: { result: CourseDiscoveryResult }) {
  const document = result.document;
  return (
    <button
      className="discovery-result-row"
      disabled={!document.url}
      onClick={() => document.url ? void window.desktop.openExternal(document.url) : undefined}
      type="button"
    >
      <div>
        <span className="source-pill">{document.source} / {document.kind}</span>
        <strong>{document.title}</strong>
        <span>{document.text}</span>
      </div>
      <div className="result-meta">
        <span>{document.module_code || document.term || result.match_reason}</span>
        <strong>{result.score.toFixed(1)}</strong>
      </div>
    </button>
  );
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
