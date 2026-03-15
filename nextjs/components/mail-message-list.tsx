import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { MailMessageSummary } from "../lib/types";
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

export function MailMessageList({
  messages,
  variant = "full",
  mailbox = "INBOX",
  query = "",
  sender = "",
  unreadOnly = false,
  limit
}: {
  messages: MailMessageSummary[];
  variant?: "compact" | "full";
  mailbox?: string;
  query?: string;
  sender?: string;
  unreadOnly?: boolean;
  limit?: number;
}) {
  if (!messages.length) {
    return null;
  }

  return (
    <div className={cn(variant === "full" ? "grid gap-3" : "flex flex-col gap-2")}>
      {messages.map((message) => (
        <Link
          key={message.uid}
          href={`/mail/${encodeURIComponent(message.uid)}${buildMailInboxQuery({ mailbox, query, sender, unreadOnly, limit })}`}
          className={cn(
            "block rounded-xl transition-colors",
            variant === "full" ? "px-4 py-4 ring-1 ring-foreground/10 hover:bg-muted/40" : "px-3 py-2 hover:bg-muted/40",
            message.is_unread ? "bg-primary/5 ring-1 ring-primary/25" : "bg-transparent"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 shrink-0 rounded-full", message.is_unread ? "bg-primary" : "bg-transparent")} />
                <p className={cn("truncate", variant === "full" ? "text-sm" : "text-sm", message.is_unread ? "font-semibold" : "font-medium")}>
                  {message.subject}
                </p>
                {message.is_unread ? <Badge variant="outline">Unread</Badge> : null}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">{getMailSenderLabel(message)}</p>
            </div>
            <time className="text-xs text-muted-foreground shrink-0">
              {formatMailDate(message.received_at, variant === "full")}
            </time>
          </div>
          {message.preview ? (
            <p className={cn("text-muted-foreground mt-2", variant === "full" ? "text-sm" : "text-xs line-clamp-2")}>
              {message.preview}
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
