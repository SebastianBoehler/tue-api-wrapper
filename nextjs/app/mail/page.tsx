import { MailInboxFiltersForm } from "../../components/mail-inbox-filters";
import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { MailMessageList } from "../../components/mail-message-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseMailInboxFilters } from "../../lib/mail-query";
import { getMailInbox, getMailMailboxes, PortalApiError } from "../../lib/portal-api";
import { ExternalLink } from "lucide-react";

export default async function MailPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    const filters = parseMailInboxFilters(await searchParams);
    const [inbox, mailboxes] = await Promise.all([
      getMailInbox(filters),
      getMailMailboxes()
    ]);

    return (
      <AppShell title="Inbox">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Student mailbox</CardTitle>
              <CardDescription>
                Read-only IMAP overview from the official Uni Tübingen mailbox.
              </CardDescription>
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
          <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Account: {inbox.account}</span>
            <span>Mailbox: {inbox.mailbox}</span>
          </CardContent>
        </Card>

        <MailInboxFiltersForm filters={filters} mailboxes={mailboxes} />

        <div className="grid gap-3">
          <MailMessageList
            messages={inbox.messages}
            mailbox={filters.mailbox}
            query={filters.query}
            sender={filters.sender}
            unreadOnly={filters.unreadOnly}
            limit={filters.limit}
          />
          {!inbox.messages.length ? (
            <Card>
              <CardContent className="text-sm text-muted-foreground">
                No messages matched the current mailbox and filter settings.
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
