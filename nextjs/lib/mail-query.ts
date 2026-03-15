import type { MailInboxFilters } from "./types";

const DEFAULT_LIMIT = 20;
const DEFAULT_MAILBOX = "INBOX";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseMailInboxFilters(
  searchParams: Record<string, string | string[] | undefined>
): MailInboxFilters {
  const mailbox = firstValue(searchParams.mailbox)?.trim() || DEFAULT_MAILBOX;
  const query = firstValue(searchParams.query)?.trim() || "";
  const sender = firstValue(searchParams.sender)?.trim() || "";
  const unreadToken = firstValue(searchParams.unread_only);
  const limitToken = Number(firstValue(searchParams.limit) || DEFAULT_LIMIT);

  return {
    mailbox,
    query,
    sender,
    unreadOnly: unreadToken === "true" || unreadToken === "on" || unreadToken === "1",
    limit: Number.isFinite(limitToken) ? Math.max(1, Math.min(limitToken, 50)) : DEFAULT_LIMIT
  };
}

export function buildMailInboxQuery(filters: Partial<MailInboxFilters>): string {
  const params = new URLSearchParams();
  if (filters.mailbox && filters.mailbox !== DEFAULT_MAILBOX) {
    params.set("mailbox", filters.mailbox);
  }
  if (filters.query?.trim()) {
    params.set("query", filters.query.trim());
  }
  if (filters.sender?.trim()) {
    params.set("sender", filters.sender.trim());
  }
  if (filters.unreadOnly) {
    params.set("unread_only", "true");
  }
  if (filters.limit && filters.limit !== DEFAULT_LIMIT) {
    params.set("limit", String(filters.limit));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
