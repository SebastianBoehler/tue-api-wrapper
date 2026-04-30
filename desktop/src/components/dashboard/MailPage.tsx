import { EmptyState, PanelHeader } from "./DashboardPrimitives";
import type { DashboardPageProps } from "./types";

export function MailPage({ data }: DashboardPageProps) {
  if (data?.mail.available === false) {
    return (
      <article className="panel">
        <PanelHeader title="Mail" meta="Unavailable" />
        <p className="muted">{data.mail.error || "Mail preview unavailable."}</p>
      </article>
    );
  }

  return (
    <article className="panel">
      <PanelHeader title="Mailbox preview" meta={`${data?.mail.unreadCount ?? 0} unread`} />
      <div className="stack-list">
        {(data?.mail.items ?? []).map((item) => (
          <div key={item.uid} className="stack-row compact-row">
            <div>
              <strong>{item.subject}</strong>
              <span>{item.from_name || item.from_address || "Unknown sender"}</span>
              {item.preview ? <span>{item.preview}</span> : null}
            </div>
            <span>{item.is_unread ? "Unread" : "Read"}</span>
          </div>
        ))}
        {data?.mail.items.length === 0 ? <EmptyState>No mail messages returned by the backend.</EmptyState> : null}
      </div>
    </article>
  );
}
