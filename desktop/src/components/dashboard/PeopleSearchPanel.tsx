import { useState } from "react";

import { searchPeople, submitPeopleAction } from "../../lib/api";
import type { DirectoryAction, DirectoryForm, DirectorySearchResponse } from "../../lib/people-types";
import { EmptyState, PanelHeader } from "./DashboardPrimitives";

export function PeopleSearchPanel({ baseUrl }: { baseUrl: string | null }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<DirectorySearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitSearch() {
    if (!baseUrl || query.trim().length < 2) {
      return;
    }
    await load(() => searchPeople(baseUrl, query.trim()));
  }

  async function submitAction(form: DirectoryForm | null | undefined, action: DirectoryAction) {
    if (!baseUrl || !form || !response) {
      return;
    }
    await load(() => submitPeopleAction(baseUrl, { query: response.query, form, action }));
  }

  async function load(task: () => Promise<DirectorySearchResponse>) {
    setLoading(true);
    setError(null);
    try {
      const nextResponse = await task();
      setResponse(nextResponse);
      setQuery(nextResponse.query);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "People search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="discover-grid">
      <article className="panel discover-search-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">People</p>
            <h3>University directory</h3>
          </div>
          <button className="secondary-button compact-button" disabled={loading || query.trim().length < 2} onClick={submitSearch} type="button">
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        <input
          className="search-input"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void submitSearch()}
          placeholder="Name, institute, chair, department"
          value={query}
        />
        {error ? <p className="inline-error">{error}</p> : null}

        <div className="stack-list">
          {(response?.sections ?? []).flatMap((section) =>
            section.items.map((person) => (
              <button key={`${section.title}-${person.name}-${person.action.target}`} className="link-row" onClick={() => void submitAction(response?.form, person.action)} type="button">
                <div>
                  <strong>{person.name}</strong>
                  <span>{person.subtitle || section.title}</span>
                </div>
                <span>Open</span>
              </button>
            ))
          )}
          {(response?.organizations ?? []).map((organization) => (
            <button key={`${organization.name}-${organization.action.target}`} className="link-row" onClick={() => void submitAction(response?.form, organization.action)} type="button">
              <div>
                <strong>{organization.name}</strong>
                <span>Organization</span>
              </div>
              <span>Open</span>
            </button>
          ))}
          {response?.outcome === "empty" || response?.outcome === "tooManyResults" ? <EmptyState>{response.message}</EmptyState> : null}
          {!response ? <EmptyState>Search the public EPV directory and open people or organization details.</EmptyState> : null}
        </div>
      </article>

      <article className="panel">
        <PanelHeader title="Directory detail" meta={response?.title ?? "No selection"} />
        {response?.person ? <PersonDetail response={response} /> : null}
        {response?.organization ? <OrganizationDetail response={response} onAction={submitAction} /> : null}
        {!response?.person && !response?.organization ? (
          <EmptyState>Select a result to inspect contact details, rooms, e-mail, web links, and organizational fields.</EmptyState>
        ) : null}
      </article>
    </section>
  );
}

function PersonDetail({ response }: { response: DirectorySearchResponse }) {
  const person = response.person;
  if (!person) {
    return null;
  }
  return (
    <div className="detail-section-list">
      <div>
        <h4>{person.name}</h4>
        {person.summary ? <p className="muted">{person.summary}</p> : null}
      </div>
      {[...person.attributes, ...person.contact_sections.flatMap((section) => section.fields)].map((field) => (
        <DirectoryFieldRow key={`${field.label}-${field.value}`} label={field.label} value={field.value} />
      ))}
    </div>
  );
}

function OrganizationDetail({
  response,
  onAction
}: {
  response: DirectorySearchResponse;
  onAction: (form: DirectoryForm | null | undefined, action: DirectoryAction) => Promise<void>;
}) {
  const organization = response.organization;
  if (!organization) {
    return null;
  }
  return (
    <div className="detail-section-list">
      <div>
        <h4>{organization.name}</h4>
        {organization.person_list_action ? (
          <button className="secondary-button" onClick={() => void onAction(response.form, organization.person_list_action!)} type="button">
            Show people
          </button>
        ) : null}
      </div>
      {organization.fields.map((field) => (
        <DirectoryFieldRow key={`${field.label}-${field.value}`} label={field.label} value={field.value} />
      ))}
    </div>
  );
}

function DirectoryFieldRow({ label, value }: { label: string; value: string }) {
  const link = linkFor(label, value);
  return (
    <div className="detail-line">
      <span>{label}</span>
      {link ? (
        <button className="text-link" onClick={() => void window.desktop.openExternal(link)} type="button">
          {value}
        </button>
      ) : (
        <strong>{value}</strong>
      )}
    </div>
  );
}

function linkFor(label: string, value: string): string | null {
  const trimmed = value.trim();
  if (label.toLowerCase() === "e-mail" && trimmed.includes("@")) {
    return `mailto:${trimmed}`;
  }
  if (label.toLowerCase() === "web" && /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}
