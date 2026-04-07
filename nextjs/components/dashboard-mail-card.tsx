import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import type { MailPanel } from "../lib/types";
import { EmptyState } from "./empty-state";
import { MailMessageList } from "./mail-message-list";

export function DashboardMailCard({ mail }: { mail: MailPanel }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-4 text-primary" />Inbox
        </CardTitle>
        <CardAction>
          <Button variant="outline" size="xs" asChild>
            <Link href="/mail">Open inbox</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {mail.available ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant={mail.unreadCount ? "default" : "secondary"}>
                {mail.unreadCount} unread
              </Badge>
              {mail.account ? (
                <span className="text-xs text-muted-foreground truncate">{mail.account}</span>
              ) : null}
            </div>
            {mail.items.length ? (
              <MailMessageList
                messages={mail.items.slice(0, 4)}
                variant="compact"
                useInlineLinks
              />
            ) : (
              <EmptyState
                icon={Mail}
                title="No messages"
                description="No messages were returned from the inbox."
              />
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {mail.error ?? "Mail is not configured for this backend yet."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
