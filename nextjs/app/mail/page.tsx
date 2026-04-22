import { MailInboxFiltersForm } from "../../components/mail-inbox-filters";
import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { EmptyState } from "../../components/empty-state";
import { MailMessageList } from "../../components/mail-message-list";
import { MailDetailPanel } from "../../components/mail-detail-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseMailInboxFilters } from "../../lib/mail-query";
import { getMailInbox, getMailMailboxes, getMailMessage, PortalApiError } from "../../lib/portal-api";
import { ExternalLink, Mail } from "lucide-react";

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    const resolved = await searchParams;
    const filters = parseMailInboxFilters(resolved);
    const uid = firstValue(resolved.uid).trim();

    const [inbox, mailboxes, message] = await Promise.all([
      getMailInbox(filters),
      getMailMailboxes(),
      uid ? getMailMessage(uid, filters.mailbox).catch(() => null) : Promise.resolve(null),
    ]);

    const header = (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Student mailbox</CardTitle>
            <CardDescription>Read-only IMAP overview from the official Uni Tübingen mailbox.</CardDescription>
          </div>
          <CardAction className="flex items-center gap-2">
            <Badge variant={inbox.unread_count ? "default" : "secondary"}>
              {inbox.unread_count} unread
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <a href="https://webmail.uni-tuebingen.de" target="_blank" rel="noreferrer">
                Webmail
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </CardAction>
        </CardHeader>
        <CardFooter className="border-t border-border/60 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Account {inbox.account}</span>
          <span>Mailbox {inbox.mailbox}</span>
        </CardFooter>
      </Card>
    );

    /* ── Split-pane layout when a message is selected ── */
    if (uid && message) {
      return (
        <AppShell title="Inbox">
          {header}
          <MailInboxFiltersForm filters={filters} mailboxes={mailboxes} />

          <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-0 border border-border rounded-4xl overflow-hidden h-[calc(100svh-theme(spacing.72))] min-h-[480px]">
            {/* Left — message list */}
            <div className="flex flex-col border-r border-border overflow-hidden">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2 bg-card border-b border-border shrink-0">
                <span className="text-xs font-medium text-muted-foreground">
                  {inbox.messages.length} messages
                </span>
                <Badge variant={inbox.unread_count ? "default" : "secondary"} className="text-[0.65rem]">
                  {inbox.unread_count} unread
                </Badge>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {inbox.messages.length ? (
                  <MailMessageList
                    messages={inbox.messages}
                    variant="compact"
                    selectedUid={uid}
                    useInlineLinks
                    mailbox={filters.mailbox}
                    query={filters.query}
                    sender={filters.sender}
                    unreadOnly={filters.unreadOnly}
                    limit={filters.limit}
                  />
                ) : (
                  <div className="py-6">
                    <EmptyState icon={Mail} title="No messages" description="No messages matched the current filters." />
                  </div>
                )}
              </div>
            </div>

            {/* Right — message detail */}
            <div className="overflow-y-auto">
              <MailDetailPanel message={message} />
            </div>
          </div>
        </AppShell>
      );
    }

    /* ── Default full-width layout ── */
    return (
      <AppShell title="Inbox">
        {header}
        <MailInboxFiltersForm filters={filters} mailboxes={mailboxes} />

        <div className="grid gap-3">
          <MailMessageList
            messages={inbox.messages}
            mailbox={filters.mailbox}
            query={filters.query}
            sender={filters.sender}
            unreadOnly={filters.unreadOnly}
            limit={filters.limit}
            useInlineLinks
          />
          {!inbox.messages.length ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Mail}
                  title="No messages"
                  description="No messages matched the current mailbox and filter settings."
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "Inbox could not load.";
    return <AppShell title="Inbox"><ErrorPanel title="Inbox unavailable" message={message} /></AppShell>;
  }
}
