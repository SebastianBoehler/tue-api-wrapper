import { useCallback, useEffect, useState } from "react";

import { fetchMailboxes, fetchMailInbox } from "./api";
import type { MailboxSummary, MailInboxSummary } from "./mail-types";

export function useMailSurface(baseUrl: string | null, enabled: boolean) {
  const [mailboxes, setMailboxes] = useState<MailboxSummary[]>([]);
  const [inbox, setInbox] = useState<MailInboxSummary | null>(null);
  const [mailbox, setMailbox] = useState("INBOX");
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!baseUrl || !enabled) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextMailboxes, nextInbox] = await Promise.all([
        fetchMailboxes(baseUrl),
        fetchMailInbox(baseUrl, { mailbox, query, unreadOnly })
      ]);
      setMailboxes(nextMailboxes);
      setInbox(nextInbox);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load mail.");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, enabled, mailbox, query, unreadOnly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    mailboxes,
    inbox,
    mailbox,
    query,
    unreadOnly,
    loading,
    error,
    setMailbox,
    setQuery,
    setUnreadOnly,
    refresh
  };
}
