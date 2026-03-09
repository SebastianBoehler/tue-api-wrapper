"use client";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import type { ModuleSearchFiltersResponse, ModuleSearchResponse, SearchOption } from "../lib/types";

function toggleSelection(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function buildSearchUrl(
  apiBaseUrl: string,
  {
    query,
    degrees,
    subjects,
    elementTypes,
    languages,
    faculty,
    maxResults
  }: {
    query: string;
    degrees: string[];
    subjects: string[];
    elementTypes: string[];
    languages: string[];
    faculty: string;
    maxResults: number;
  }
) {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("query", query.trim());
  }
  for (const value of degrees) {
    params.append("degree", value);
  }
  for (const value of subjects) {
    params.append("subject", value);
  }
  for (const value of elementTypes) {
    params.append("element_type", value);
  }
  for (const value of languages) {
    params.append("language", value);
  }
  if (faculty) {
    params.append("faculty", faculty);
  }
  params.set("max_results", String(maxResults));
  return `${apiBaseUrl}/api/alma/module-search?${params.toString()}`;
}

function matchesOption(option: SearchOption, needle: string) {
  const normalizedNeedle = needle.trim().toLowerCase();
  if (!normalizedNeedle) {
    return false;
  }
  return option.label.toLowerCase().includes(normalizedNeedle);
}

export function CourseDiscovery({
  apiBaseUrl,
  filters,
  sourcePageUrl
}: {
  apiBaseUrl: string;
  filters: ModuleSearchFiltersResponse["filters"];
  sourcePageUrl: string;
}) {
  const [query, setQuery] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [selectedDegrees, setSelectedDegrees] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedElementTypes, setSelectedElementTypes] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [resultsState, setResultsState] = useState<ModuleSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const deferredQuery = useDeferredValue(query);
  const selectedSubjectOptions = filters.subjects.filter((option) => selectedSubjects.includes(option.value));
  const suggestedSubjects = filters.subjects
    .filter((option) => !selectedSubjects.includes(option.value) && matchesOption(option, subjectInput))
    .slice(0, 8);
  const hasActiveCriteria =
    deferredQuery.trim().length > 0 ||
    selectedDegrees.length > 0 ||
    selectedSubjects.length > 0 ||
    selectedElementTypes.length > 0 ||
    selectedLanguages.length > 0 ||
    selectedFaculty.length > 0;

  useEffect(() => {
    if (!hasActiveCriteria) {
      setResultsState(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildSearchUrl(apiBaseUrl, {
            query: deferredQuery,
            degrees: selectedDegrees,
            subjects: selectedSubjects,
            elementTypes: selectedElementTypes,
            languages: selectedLanguages,
            faculty: selectedFaculty,
            maxResults: 120
          }),
          {
            signal: controller.signal
          }
        );

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(detail || `Module search failed with ${response.status}.`);
        }

        const payload = (await response.json()) as ModuleSearchResponse;
        setResultsState(payload);
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }
        setResultsState(null);
        setError(requestError instanceof Error ? requestError.message : "Module search failed.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [
    apiBaseUrl,
    deferredQuery,
    hasActiveCriteria,
    selectedDegrees,
    selectedElementTypes,
    selectedFaculty,
    selectedLanguages,
    selectedSubjects
  ]);

  function addSubject(option: SearchOption) {
    startTransition(() => {
      setSelectedSubjects((current) => (current.includes(option.value) ? current : [...current, option.value]));
    });
    setSubjectInput("");
  }

  function clearFilters() {
    startTransition(() => {
      setSelectedDegrees([]);
      setSelectedSubjects([]);
      setSelectedElementTypes([]);
      setSelectedLanguages([]);
      setSelectedFaculty("");
    });
    setSubjectInput("");
    setQuery("");
  }

  function buildDetailHref(detailUrl: string | null) {
    if (!detailUrl) {
      return sourcePageUrl;
    }
    return `/courses/detail?url=${encodeURIComponent(detailUrl)}`;
  }

  return (
    <div className="catalog-shell">
      <section className="catalog-hero panel">
        <div>
          <p className="eyebrow">Public Alma discovery</p>
          <h3>Search across degree types and subjects without hard-coding one faculty</h3>
          <p className="hero-copy">
            Use Alma&apos;s public module-description search as the catalog backbone. Combine degree types like
            `Master` with multiple subjects such as `Informatik / Computer Science` and `Machine Learning`.
          </p>
        </div>
        <a href={sourcePageUrl} className="inline-link">
          Open Alma source
        </a>
      </section>

      <section className="catalog-layout">
        <aside className="panel catalog-sidebar">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Filters</p>
              <h3>Shape the catalog view</h3>
            </div>
            <button type="button" className="inline-link button-reset" onClick={clearFilters}>
              Reset
            </button>
          </div>

          <label className="field-block">
            <span className="field-label">Search terms</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="catalog-search-input"
              placeholder="Machine learning, ethics, NLP, econometrics..."
            />
          </label>

          <div className="field-block">
            <span className="field-label">Degree type</span>
            <div className="filter-pill-row">
              {filters.degrees.map((option) => {
                const isActive = selectedDegrees.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={isActive ? "filter-pill active" : "filter-pill"}
                    aria-pressed={isActive}
                    onClick={() =>
                      startTransition(() => {
                        setSelectedDegrees((current) => toggleSelection(current, option.value));
                      })
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field-block">
            <span className="field-label">Subjects</span>
            <div className="catalog-subject-picker">
              <input
                type="search"
                value={subjectInput}
                onChange={(event) => setSubjectInput(event.target.value)}
                className="catalog-search-input"
                placeholder="Add Informatik, Machine Learning, Biology..."
              />
              {suggestedSubjects.length ? (
                <div className="subject-suggestion-list">
                  {suggestedSubjects.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="subject-suggestion"
                      onClick={() => addSubject(option)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {selectedSubjectOptions.length ? (
              <div className="selected-chip-row">
                {selectedSubjectOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="selected-chip"
                    onClick={() =>
                      startTransition(() => {
                        setSelectedSubjects((current) => current.filter((value) => value !== option.value));
                      })
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="catalog-select-grid">
            <label className="field-block">
              <span className="field-label">Element type</span>
              <div className="filter-pill-row compact">
                {filters.elementTypes.slice(0, 6).map((option) => {
                  const isActive = selectedElementTypes.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={isActive ? "filter-pill active" : "filter-pill"}
                      aria-pressed={isActive}
                      onClick={() =>
                        startTransition(() => {
                          setSelectedElementTypes((current) => toggleSelection(current, option.value));
                        })
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </label>

            <label className="field-block">
              <span className="field-label">Teaching language</span>
              <div className="filter-pill-row compact">
                {filters.languages.map((option) => {
                  const isActive = selectedLanguages.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={isActive ? "filter-pill active" : "filter-pill"}
                      aria-pressed={isActive}
                      onClick={() =>
                        startTransition(() => {
                          setSelectedLanguages((current) => toggleSelection(current, option.value));
                        })
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </label>

            <label className="field-block">
              <span className="field-label">Faculty</span>
              <select
                value={selectedFaculty}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  startTransition(() => {
                    setSelectedFaculty(nextValue);
                  });
                }}
                className="catalog-select"
              >
                <option value="">Any faculty</option>
                {filters.faculties.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </aside>

        <div className="catalog-main">
          <section className="panel">
            <div className="results-summary">
              <div>
                <p className="eyebrow">Results</p>
                <h3>Catalog matches</h3>
              </div>
              <div className="status-row">
                {isLoading || isPending ? <span className="status-pill">Searching…</span> : null}
                {resultsState ? (
                  <span className="status-pill">
                    {resultsState.returnedResults}
                    {typeof resultsState.totalResults === "number" ? ` / ${resultsState.totalResults}` : ""} courses
                  </span>
                ) : null}
              </div>
            </div>

            {resultsState?.truncated ? (
              <p className="hero-copy">
                Alma returned more results than the current page limit. Narrow the subject or degree filters to get a
                tighter list.
              </p>
            ) : null}

            {error ? <p className="catalog-error">{error}</p> : null}

            {resultsState?.results.length ? (
              <div className="course-grid">
                {resultsState.results.map((result) => (
                  <a
                    key={`${result.detail_url ?? "result"}-${result.number ?? "none"}-${result.title}`}
                    href={buildDetailHref(result.detail_url)}
                    className="course-card"
                  >
                    <div className="course-card-header">
                      <span className="course-type">{result.element_type ?? "Catalog item"}</span>
                      <strong>{result.title}</strong>
                    </div>
                    <div className="course-card-footer">
                      <span>{result.number ?? "No module number"}</span>
                      <span>Open details</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : hasActiveCriteria && !isLoading ? (
              <div className="empty-state">
                <strong>No courses matched that combination.</strong>
                <p>
                  Try a broader search term or switch the subject set. Multi-subject combinations work well for
                  `Master + Informatik / Computer Science + Machine Learning`.
                </p>
              </div>
            ) : (
              <div className="empty-state">
                <strong>Start with a query or a degree filter.</strong>
                <p>
                  The page is wired to Alma&apos;s public search, so you can browse across the university instead of
                  staying inside one department-specific table.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
