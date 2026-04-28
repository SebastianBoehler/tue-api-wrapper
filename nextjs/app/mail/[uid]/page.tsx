import type { Route } from "next";
import Link from "next/link";
import { AppShell } from "../../../components/app-shell";
import { ErrorPanel } from "../../../components/error-panel";
import { MailDetailPanel } from "../../../components/mail-detail-panel";
import { Button } from "@/components/ui/button";
import { buildMailInboxQuery, parseMailInboxFilters } from "../../../lib/mail-query";
import { getMailMessage, PortalApiError } from "../../../lib/portal-api";
import { ArrowLeft } from "lucide-react";

export default async function MailDetailPage({
  params,
  searchParams,
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
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={backHref as Route}>
              <ArrowLeft className="size-3.5" />
              Inbox
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <MailDetailPanel message={message} />
        </div>
      </AppShell>
    );
  } catch (error) {
    const message =
      error instanceof PortalApiError ? error.message : "Message could not load.";
    return (
      <AppShell title="Message">
        <ErrorPanel title="Message unavailable" message={message} />
      </AppShell>
    );
  }
}
