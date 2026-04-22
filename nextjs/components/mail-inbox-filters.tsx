import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MailInboxFilters, MailboxSummary } from "../lib/types";

export function MailInboxFiltersForm({
  filters,
  mailboxes
}: {
  filters: MailInboxFilters;
  mailboxes: MailboxSummary[];
}) {
  return (
    <form method="get" action="/mail" className="grid gap-3 rounded-[1.75rem] border border-border bg-card/90 p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mailbox</span>
          <select
            name="mailbox"
            defaultValue={filters.mailbox}
            className="h-9 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {mailboxes.map((mailbox) => (
              <option key={mailbox.name} value={mailbox.name}>
                {mailbox.label}
                {mailbox.unread_count ? ` (${mailbox.unread_count} unread)` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</span>
          <Input name="query" defaultValue={filters.query} placeholder="subject, sender, preview" />
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sender</span>
          <Input name="sender" defaultValue={filters.sender} placeholder="uni-tuebingen.de or name" />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="unread_only"
            value="true"
            defaultChecked={filters.unreadOnly}
            className="size-4 rounded border border-input"
          />
          Unread only
        </label>

        <div className="flex items-center gap-2">
          <input type="hidden" name="limit" value={String(filters.limit)} />
          <Button size="sm" variant="outline" asChild>
            <Link href="/mail">Reset</Link>
          </Button>
          <Button type="submit" size="sm">Search</Button>
        </div>
      </div>
    </form>
  );
}
