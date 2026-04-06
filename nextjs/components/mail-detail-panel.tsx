import { Badge } from "@/components/ui/badge";
import { Paperclip } from "lucide-react";
import type { MailMessageDetailResponse } from "../lib/types";
import { formatMailDate } from "./mail-message-list";

function MetaRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid gap-0.5 md:grid-cols-[80px_minmax(0,1fr)]">
      <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground pt-0.5">
        {label}
      </span>
      <span className="text-sm break-words">{value}</span>
    </div>
  );
}

export function MailDetailPanel({
  message,
}: {
  message: MailMessageDetailResponse;
}) {
  const fromLabel =
    message.from_name && message.from_address
      ? `${message.from_name} <${message.from_address}>`
      : message.from_name ?? message.from_address;

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold leading-snug">{message.subject}</h2>
          {message.is_unread ? (
            <Badge className="shrink-0">Unread</Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">Read</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{message.mailbox}</p>
      </div>

      {/* Metadata block */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3">
        <MetaRow label="From" value={fromLabel ?? null} />
        <MetaRow label="To" value={message.to_recipients.join(", ") || null} />
        <MetaRow label="Cc" value={message.cc_recipients.join(", ") || null} />
        <MetaRow label="Date" value={formatMailDate(message.received_at, true)} />
        {message.attachment_names.length ? (
          <div className="flex items-start gap-1.5 pt-1">
            <Paperclip className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-xs text-muted-foreground break-words">
              {message.attachment_names.join(", ")}
            </span>
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div>
        {message.body_text ? (
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">
            {message.body_text}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No readable plaintext body was available for this message.
          </p>
        )}
      </div>
    </div>
  );
}
