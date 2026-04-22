import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { MailInboxFilters, MailMessageSummary } from "../lib/types";
import { buildMailInboxQuery } from "../lib/mail-query";
import { cn } from "../lib/utils";

export function formatMailDate(value: string | null, detailed = false) {
  if (!value) {
    return detailed ? "Unknown date" : "Unknown";
  }
  return new Intl.DateTimeFormat("de-DE", detailed ? {
    dateStyle: "medium",
    timeStyle: "short"
  } : {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function getMailSenderLabel(message: MailMessageSummary) {
  return message.from_name ?? message.from_address ?? "Unknown sender";
}

function buildInlineHref(uid: string, filters: Partial<MailInboxFilters>): string {
  const base = buildMailInboxQuery(filters);
  const sep = base ? "&" : "?";
  return `/mail${base}${sep}uid=${encodeURIComponent(uid)}`;
}

export function MailMessageList({
  messages,
  variant = "full",
  mailbox = "INBOX",
  query = "",
  sender = "",
  unreadOnly = false,
  limit,
  selectedUid,
  useInlineLinks = false,
}: {
  messages: MailMessageSummary[];
  variant?: "compact" | "full";
  mailbox?: string;
  query?: string;
  sender?: string;
  unreadOnly?: boolean;
  limit?: number;
  /** UID of the currently open message (highlights it in split-pane mode). */
  selectedUid?: string;
  /** When true, clicking a message updates ?uid=… instead of navigating to /mail/[uid]. */
  useInlineLinks?: boolean;
}) {
  if (!messages.length) {
    return null;
  }

  const inboxFilters: Partial<MailInboxFilters> = { mailbox, query, sender, unreadOnly, limit };

  return (
    <div className={cn(variant === "full" ? "grid gap-3" : "flex flex-col gap-0.5")}>
      {messages.map((message) => {
        const isSelected = selectedUid === message.uid;
        const href = (useInlineLinks
          ? buildInlineHref(message.uid, inboxFilters)
          : `/mail/${encodeURIComponent(message.uid)}${buildMailInboxQuery(inboxFilters)}`) as Route;

        return (
          <Link
            key={message.uid}
            href={href}
            className={cn(
              "block rounded-[1.4rem] border transition-colors",
              variant === "full"
                ? "px-4 py-4 border-border bg-background/90 hover:bg-muted/35"
                : "px-3 py-3 border-transparent hover:bg-muted/35",
              message.is_unread && !isSelected ? "bg-primary/5 ring-1 ring-primary/25" : "",
              isSelected
                ? "bg-sidebar-accent border-[--tue-red]/30"
                : "bg-transparent"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      message.is_unread ? "bg-primary" : "bg-transparent"
                    )}
                  />
                  <p
                    className={cn(
                      "truncate text-sm",
                      message.is_unread ? "font-semibold" : "font-medium"
                    )}
                  >
                    {message.subject}
                  </p>
                  {message.is_unread && variant === "full" ? (
                    <Badge variant="outline">Unread</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {getMailSenderLabel(message)}
                </p>
                {message.preview ? (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{message.preview}</p>
                ) : null}
              </div>
              <time className="text-xs text-muted-foreground shrink-0">
                {formatMailDate(message.received_at, variant === "full")}
              </time>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
