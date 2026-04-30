import { useState } from "react";

import { moveMailMessage } from "../../lib/api";
import { formatTimestamp } from "../../lib/format";
import { EmptyState, PanelHeader } from "./DashboardPrimitives";
import type { MailPageProps } from "./types";

const approvalText = "Die Hochschulleitung hat dem Versand dieser Rundmail zugestimmt.";

export function MailPage({
  inbox,
  mailbox,
  mailboxes,
  mailError,
  mailLoading,
  query,
  unreadOnly,
  onRefreshMail,
  setMailbox,
  setQuery,
  setUnreadOnly,
  state
}: MailPageProps) {
  const [movingUid, setMovingUid] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const archiveMailbox = mailboxes.find((item) =>
    item.special_use === "archive" || /archive|archiv/i.test(`${item.name} ${item.label}`)
  );

  async function archiveMessage(uid: string) {
    if (!state.backendUrl || !archiveMailbox) {
      return;
    }
    setMovingUid(uid);
    setArchiveError(null);
    try {
      await moveMailMessage(state.backendUrl, { uid, mailbox, destination: archiveMailbox.name });
      onRefreshMail();
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : "Could not archive message.");
    } finally {
      setMovingUid(null);
    }
  }

  return (
    <div className="page-grid">
      <section className="panel mail-filter-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mail</p>
            <h3>{inbox ? mailboxLabel(inbox.mailbox, mailboxes) : "Mailbox"}</h3>
          </div>
          <button className="ghost-button compact-button" disabled={mailLoading} onClick={onRefreshMail} type="button">
            {mailLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
        <div className="mail-filter-row">
          <select value={mailbox} onChange={(event) => setMailbox(event.target.value)}>
            {mailboxOptions(mailboxes, inbox?.unread_count).map((option) => (
              <option key={option.name} value={option.name}>{mailboxTitle(option)}</option>
            ))}
          </select>
          <input
            placeholder="Search subject, sender, preview"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="checkbox-filter">
            <input checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} type="checkbox" />
            <span>Unread only</span>
          </label>
        </div>
        {mailError ? <p className="inline-error">{mailError}</p> : null}
        {archiveError ? <p className="inline-error">{archiveError}</p> : null}
      </section>

      <article className="panel">
        <PanelHeader title="Messages" meta={`${inbox?.unread_count ?? 0} unread`} />
        <div className="stack-list">
          {(inbox?.messages ?? []).map((item) => {
            const preview = cleanPreview(item.preview);
            const hasApproval = Boolean(item.preview?.includes(approvalText));
            return (
              <div key={item.uid} className={item.is_unread ? "mail-row unread" : "mail-row"}>
                <div className="mail-status">{hasApproval ? "✓" : item.is_unread ? "•" : ""}</div>
                <div>
                  <strong>{item.subject}</strong>
                  <span>{item.from_name || item.from_address || "Unknown sender"}</span>
                  {preview ? <span>{preview}</span> : null}
                </div>
                <div className="mail-row-actions">
                  <time>{formatTimestamp(item.received_at)}</time>
                  {archiveMailbox && inbox?.mailbox !== archiveMailbox.name ? (
                    <button className="ghost-button compact-button" disabled={movingUid === item.uid} onClick={() => void archiveMessage(item.uid)} type="button">
                      {movingUid === item.uid ? "Archiving..." : "Archive"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {inbox?.messages.length === 0 ? <EmptyState>No messages match the selected mailbox and filters.</EmptyState> : null}
        </div>
      </article>
    </div>
  );
}

function mailboxOptions(mailboxes: MailPageProps["mailboxes"], inboxUnread?: number) {
  const inbox = { name: "INBOX", label: "Inbox", unread_count: inboxUnread };
  const seen = new Set<string>();
  return [inbox, ...mailboxes].filter((mailbox) => seen.has(mailbox.name) ? false : seen.add(mailbox.name));
}

function mailboxTitle(mailbox: { label: string; unread_count?: number | null }): string {
  return mailbox.unread_count ? `${mailbox.label} ${mailbox.unread_count}` : mailbox.label;
}

function mailboxLabel(name: string, mailboxes: MailPageProps["mailboxes"]): string {
  return mailboxes.find((mailbox) => mailbox.name === name)?.label ?? (name === "INBOX" ? "Inbox" : name);
}

function cleanPreview(value?: string | null): string | null {
  const cleaned = value?.replace(approvalText, "").replace(/\s+/g, " ").trim();
  return cleaned || null;
}
