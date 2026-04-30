import type { AssistantToolCallTrace, AssistantToolCard } from "../../../shared/desktop-types";
import { formatDateRange } from "../../lib/format";

type AnyRecord = Record<string, unknown>;

export function AssistantResultPanel({
  cards,
  toolCalls
}: {
  cards: AssistantToolCard[];
  toolCalls: AssistantToolCallTrace[];
}) {
  if (cards.length === 0 && toolCalls.length === 0) {
    return null;
  }

  return (
    <section className="assistant-artifacts">
      {toolCalls.length > 0 ? (
        <div className="tool-call-list" aria-label="Assistant tool calls">
          {toolCalls.map((call) => (
            <span key={call.id} className={`tool-call-chip ${call.status}`} title={call.summary}>
              {call.name}
            </span>
          ))}
        </div>
      ) : null}

      {cards.length > 0 ? (
        <div className="generated-ui-list" aria-label="Generated study UI">
          {cards.map((card) => (
            <GeneratedCard key={`${card.name}-${card.title}`} card={card} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function GeneratedCard({ card }: { card: AssistantToolCard }) {
  if (card.name === "get_grades") {
    return <GradesCard card={card} items={records(card.data)} />;
  }
  if (card.name === "get_study_snapshot") {
    return <DashboardCard card={card} />;
  }
  if (card.name === "search_mail") {
    return <ListCard card={card} items={recordsAt(card.data, "messages")} fields={["subject", "from_name", "preview"]} />;
  }
  if (card.name === "search_talks") {
    return <ListCard card={card} items={recordsAt(card.data, "items")} fields={["title", "speaker_name", "location"]} urlField="source_url" />;
  }
  if (card.name === "search_timms") {
    return <ListCard card={card} items={recordsAt(card.data, "results")} fields={["title", "duration_label"]} urlField="item_url" />;
  }
  if (card.name === "search_people") {
    return <PeopleCard card={card} />;
  }
  return <ListCard card={card} items={[]} fields={[]} />;
}

function DashboardCard({ card }: { card: AssistantToolCard }) {
  const data = asRecord(card.data);
  const agenda = recordsAt(asRecord(data.agenda), "items").slice(0, 5);
  const exams = records(data.exams).slice(0, 6);
  const metrics = records(data.metrics).slice(0, 4);
  return (
    <article className="generated-card">
      <div className="generated-card-header">
        <strong>{card.title}</strong>
        <span>{text(data.termLabel) || card.summary}</span>
      </div>
      <div className="mini-metrics">
        {metrics.map((metric) => (
          <div key={text(metric.label)}>
            <span>{text(metric.label)}</span>
            <strong>{text(metric.value)}</strong>
          </div>
        ))}
      </div>
      <GradesList items={exams} />
      <div className="assistant-mini-list">
        {agenda.map((item) => (
          <div key={`${text(item.summary)}-${text(item.start)}`} className="assistant-mini-row">
            <time>{formatDateRange(text(item.start), text(item.end))}</time>
            <strong>{text(item.summary)}</strong>
            <span>{text(item.location) || "Location pending"}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function GradesCard({ card, items }: { card: AssistantToolCard; items: AnyRecord[] }) {
  return (
    <article className="generated-card">
      <div className="generated-card-header">
        <strong>{card.title}</strong>
        <span>{card.summary}</span>
      </div>
      <GradesList items={items.slice(0, 12)} />
    </article>
  );
}

function GradesList({ items }: { items: AnyRecord[] }) {
  if (items.length === 0) {
    return <p className="muted">No grade records returned.</p>;
  }
  return (
    <div className="assistant-mini-list">
      {items.map((item, index) => (
        <div key={`${text(item.number)}-${text(item.title)}-${index}`} className="grade-row">
          <div>
            <strong>{text(item.title) || "Untitled exam"}</strong>
            <span>{[text(item.number), text(item.status), creditLabel(item.cp)].filter(Boolean).join(" · ")}</span>
          </div>
          <strong>{text(item.grade) || "Pending"}</strong>
        </div>
      ))}
    </div>
  );
}

function PeopleCard({ card }: { card: AssistantToolCard }) {
  const data = asRecord(card.data);
  const person = asRecord(data.person);
  const fields = records(person.attributes).slice(0, 4);
  const sections = records(data.sections);
  const people = sections.flatMap((section) => records(section.items)).slice(0, 6);
  return (
    <article className="generated-card">
      <div className="generated-card-header">
        <strong>{text(person.name) || card.title}</strong>
        <span>{text(data.outcome) || card.summary}</span>
      </div>
      <div className="assistant-mini-list">
        {(fields.length ? fields : people).map((item, index) => (
          <div key={`${text(item.label) || text(item.name)}-${index}`} className="assistant-mini-row">
            <strong>{text(item.label) || text(item.name)}</strong>
            <span>{text(item.value) || text(item.subtitle)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function ListCard({
  card,
  items,
  fields,
  urlField
}: {
  card: AssistantToolCard;
  items: AnyRecord[];
  fields: string[];
  urlField?: string;
}) {
  return (
    <article className="generated-card">
      <div className="generated-card-header">
        <strong>{card.title}</strong>
        <span>{card.summary}</span>
      </div>
      <div className="assistant-mini-list">
        {items.slice(0, 6).map((item, index) => (
          <ResultRow key={`${text(item[fields[0]])}-${index}`} item={item} fields={fields} url={urlField ? text(item[urlField]) : ""} />
        ))}
        {items.length === 0 ? <p className="muted">No structured rows returned.</p> : null}
      </div>
    </article>
  );
}

function ResultRow({ item, fields, url }: { item: AnyRecord; fields: string[]; url: string }) {
  const content = (
    <>
      <strong>{text(item[fields[0]]) || "Untitled"}</strong>
      <span>{fields.slice(1).map((field) => text(item[field])).filter(Boolean).join(" · ")}</span>
    </>
  );
  if (!url) {
    return <div className="assistant-mini-row">{content}</div>;
  }
  return (
    <button className="assistant-mini-row clickable-row" onClick={() => void window.desktop.openExternal(url)} type="button">
      {content}
    </button>
  );
}

function records(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.map(asRecord).filter((item) => Object.keys(item).length > 0) : [];
}

function recordsAt(value: unknown, key: string): AnyRecord[] {
  return records(asRecord(value)[key]);
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : {};
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function creditLabel(value: unknown): string {
  const raw = text(value);
  return raw ? `${raw} CP` : "";
}
