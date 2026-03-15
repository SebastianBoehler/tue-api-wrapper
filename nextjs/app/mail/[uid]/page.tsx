import Link from "next/link";
import { AppShell } from "../../../components/app-shell";
import { ErrorPanel } from "../../../components/error-panel";
import { formatMailDate } from "../../../components/mail-message-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildMailInboxQuery, parseMailInboxFilters } from "../../../lib/mail-query";
import { getMailMessage, PortalApiError } from "../../../lib/portal-api";
import { ArrowLeft } from "lucide-react";

function MetadataRow({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <div className="grid gap-1 md:grid-cols-[88px_minmax(0,1fr)]">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm break-words">{value}</span>
    </div>
  );
}

export default async function MailDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ uid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { uid } = await params;
  const filters = parseMailInboxFilters(await searchParams);
  const backHref = `/mail${buildMailInboxQuery(filters)}`;

  try {
    const message = await getMailMessage(uid, filters.mailbox);

    return (
      <AppShell title="Message">
        <Card className={message.is_unread ? "bg-primary/5 ring-primary/25" : undefined}>
          <CardHeader>
            <div>
              <CardDescription>{message.mailbox}</CardDescription>
              <CardTitle className="text-xl">{message.subject}</CardTitle>
            </div>
            <CardAction className="flex items-center gap-2">
              {message.is_unread ? <Badge>Unread</Badge> : <Badge variant="secondary">Read</Badge>}
              <Button variant="outline" size="sm" asChild>
                <a href={backHref}>
                  <ArrowLeft className="size-3.5" />
                  Back
                </a>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3">
            <MetadataRow
              label="From"
              value={message.from_name && message.from_address
                ? `${message.from_name} <${message.from_address}>`
                : message.from_name ?? message.from_address}
            />
            <MetadataRow label="To" value={message.to_recipients.join(", ") || null} />
            <MetadataRow label="Cc" value={message.cc_recipients.join(", ") || null} />
            <MetadataRow label="Date" value={formatMailDate(message.received_at, true)} />
            {message.attachment_names.length ? (
              <MetadataRow label="Files" value={message.attachment_names.join(", ")} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Message body</CardTitle>
            <CardDescription>Rendered from the plaintext part when available.</CardDescription>
          </CardHeader>
          <CardContent>
            {message.body_text ? (
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">
                {message.body_text}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">
                No readable plaintext body was available for this message.
              </p>
            )}
          </CardContent>
        </Card>
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "Message could not load.";
    return <AppShell title="Message"><ErrorPanel title="Message unavailable" message={message} /></AppShell>;
  }
}
