import { useState } from "react";

import { fetchMailMessage, moveMailMessage } from "../../lib/api";
import { formatTimestamp } from "../../lib/format";
import type { MailMessageDetail } from "../../lib/mail-types";
import { EmptyState, PanelHeader } from "./DashboardPrimitives";
import type { MailPageProps } from "./types";

const broadcastApprovalPattern = /Die Hochschulleitung hat (?:dem|den) Versand dieser (?:Rundmail|Runde) zugestimmt\.?/i;
const broadcastResponsibilityBlockPattern =
  /\*{8,}\s*\*\s*\*\s*\*\s*Die inhaltliche Verantwortung liegt bei der Absenderin\/dem Absender\s*\*\s*\*{8,}/i;

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
  const [selectedMessage, setSelectedMessage] = useState<MailMessageDetail | null>(null);
  const [selectedMessageUid, setSelectedMessageUid] = useState<string | null>(null);
  const [messageLoadingUid, setMessageLoadingUid] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
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

  async function selectMessage(uid: string) {
    if (!state.backendUrl) {
      return;
    }
    setSelectedMessageUid(uid);
    setSelectedMessage(null);
    setMessageLoadingUid(uid);
    setMessageError(null);
    try {
      setSelectedMessage(await fetchMailMessage(state.backendUrl, { uid, mailbox }));
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Could not load message.");
    } finally {
      setMessageLoadingUid(null);
    }
  }

  function closeMessage() {
    setSelectedMessageUid(null);
    setSelectedMessage(null);
    setMessageLoadingUid(null);
    setMessageError(null);
  }

  if (selectedMessageUid) {
    return (
      <MailReaderView
        error={messageError}
        loading={messageLoadingUid === selectedMessageUid}
        message={selectedMessage}
        onBack={closeMessage}
      />
    );
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
        {messageError ? <p className="inline-error">{messageError}</p> : null}
        <div className="stack-list">
          {(inbox?.messages ?? []).map((item) => {
            const preview = cleanPreview(item.preview);
            const hasApproval = hasBroadcastApproval(item.preview);
            return (
              <button
                key={item.uid}
                className={mailRowClass(item)}
                onClick={() => void selectMessage(item.uid)}
                type="button"
              >
                <div className="mail-status">{hasApproval ? "✓" : item.is_unread ? "•" : ""}</div>
                <div>
                  <strong>{item.subject}</strong>
                  <span>{item.from_name || item.from_address || "Unknown sender"}</span>
                  {preview ? <span>{preview}</span> : null}
                </div>
                <div className="mail-row-actions">
                  <time>{formatTimestamp(item.received_at)}</time>
                  {archiveMailbox && inbox?.mailbox !== archiveMailbox.name ? (
                    <button
                      className="ghost-button compact-button"
                      disabled={movingUid === item.uid}
                      onClick={(event) => {
                        event.stopPropagation();
                        void archiveMessage(item.uid);
                      }}
                      type="button"
                    >
                      {movingUid === item.uid ? "Archiving..." : "Archive"}
                    </button>
                  ) : null}
                </div>
              </button>
            );
          })}
          {inbox?.messages.length === 0 ? <EmptyState>No messages match the selected mailbox and filters.</EmptyState> : null}
        </div>
      </article>
    </div>
  );
}

function MailReaderView({
  error,
  loading,
  message,
  onBack
}: {
  error: string | null;
  loading: boolean;
  message: MailMessageDetail | null;
  onBack: () => void;
}) {
  return (
    <div className="page-grid">
      <article className="panel wide-panel mail-reader-panel">
        <div className="mail-reader-toolbar">
          <button className="ghost-button compact-button" onClick={onBack} type="button">
            Back
          </button>
          <span>{message ? formatTimestamp(message.received_at) : "Message"}</span>
        </div>
        {error ? <p className="inline-error">{error}</p> : null}
        {loading ? <EmptyState>Loading message...</EmptyState> : null}
        {!loading && message ? <MailMessageContent message={message} /> : null}
      </article>
    </div>
  );
}

function MailMessageContent({ message }: { message: MailMessageDetail }) {
  const body = cleanMessageBody(message);
  return (
    <div className="mail-detail-content">
      <div className="mail-detail-header">
        <h3>{message.subject}</h3>
        <span>{message.from_name || message.from_address || "Unknown sender"}</span>
        {message.to_recipients.length ? <span>To: {message.to_recipients.join(", ")}</span> : null}
        {message.cc_recipients.length ? <span>CC: {message.cc_recipients.join(", ")}</span> : null}
        {hasBroadcastApproval(message.body_text, message.preview) ? (
          <span className="mail-verification-badge">✓ Approved broadcast mail</span>
        ) : null}
      </div>
      <div className="mail-body-text">{body || "This message has no readable plain-text body."}</div>
      {message.attachment_names.length ? (
        <div className="mail-attachments">
          <strong>Attachments</strong>
          {message.attachment_names.map((name) => <span key={name}>{name}</span>)}
        </div>
      ) : null}
    </div>
  );
}

function mailRowClass(item: { is_unread: boolean }): string {
  const classes = ["mail-row"];
  if (item.is_unread) {
    classes.push("unread");
  }
  return classes.join(" ");
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
  const cleaned = stripBroadcastBoilerplate(value).replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function cleanMessageBody(message: MailMessageDetail): string {
  const value = message.body_text?.trim() || message.preview || "";
  return stripBroadcastBoilerplate(value).trim();
}

function stripBroadcastBoilerplate(value?: string | null): string {
  return (value ?? "")
    .replace(broadcastApprovalPattern, "")
    .replace(broadcastResponsibilityBlockPattern, "");
}

function hasBroadcastApproval(...values: Array<string | null | undefined>): boolean {
  return values.some((value) => Boolean(value && broadcastApprovalPattern.test(value)));
}
