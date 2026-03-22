import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildPortalApiUrl, getDocuments, PortalApiError } from "../../lib/portal-api";
import { Download, FileText, ExternalLink } from "lucide-react";

function looksLikeTranscript(label: string): boolean {
  const normalized = label.toLowerCase();
  return [
    "transcript",
    "transcript of records",
    "notenspiegel",
    "leistungsübersicht",
    "grades overview",
    "grade report",
  ].some((token) => normalized.includes(token));
}

export default async function DocumentsPage() {
  try {
    const documents = await getDocuments();
    const transcriptReports = documents.reports.filter((doc) => looksLikeTranscript(doc.label));
    const otherReports = documents.reports.filter((doc) => !looksLikeTranscript(doc.label));

    return (
      <AppShell title="Documents">
        <Card>
          <CardHeader>
            <CardTitle>Study service</CardTitle>
            <CardDescription>
              Read-only Alma session metadata extracted from the study-service view captured by the wrapper.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="text-sm font-medium mt-1">{documents.bannerText ?? "No Alma registration banner exposed"}</p>
                {documents.personName ? (
                  <p className="text-xs text-muted-foreground mt-1">Session owner: {documents.personName}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {documents.tabs.map((tab) => (
                  <Badge key={tab.button_name} variant={tab.is_active ? "secondary" : "outline"}>
                    {tab.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active tab</p>
              <p className="text-sm font-medium mt-1">{documents.activeTabLabel ?? "Unknown"}</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <a href={documents.sourcePageUrl}>
                  <ExternalLink className="size-4" />
                  Open Alma study service
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {documents.currentDownloadUrl ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Download className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Current PDF available</p>
                  <p className="text-xs text-muted-foreground">Alma is exposing a downloadable document.</p>
                </div>
              </div>
              <Button size="sm" asChild>
                <a href={buildPortalApiUrl(documents.currentDownloadUrl)}>Download PDF</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-3">
              <FileText className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No current PDF</p>
                <p className="text-xs text-muted-foreground">
                  Alma is not currently exposing a direct PDF download on the study-service page for this account.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Open output requests</CardTitle>
            <CardDescription>
              Alma exposes student-specific request groups alongside the certificate jobs on this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents.outputRequests.length ? (
              <div className="divide-y divide-border">
                {documents.outputRequests.map((request) => (
                  <div key={request.trigger_name} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{request.label}</p>
                      <p className="text-xs text-muted-foreground">{request.message ?? "No additional Alma status message."}</p>
                    </div>
                    <Badge variant="secondary">{request.count ?? 0}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Alma did not expose any output-request groups on the current study-service page.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transcript and certificate jobs</CardTitle>
            <CardDescription>{documents.reports.length} available</CardDescription>
          </CardHeader>
          <CardContent>
            {transcriptReports.length ? (
              <div className="divide-y divide-border mb-4">
                {transcriptReports.map((doc) => (
                  <div key={`transcript-${doc.trigger_name}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{doc.label}</p>
                      <p className="text-xs text-muted-foreground">JSF trigger: {doc.trigger_name}</p>
                    </div>
                    <Badge variant="secondary">Transcript-like</Badge>
                  </div>
                ))}
              </div>
            ) : null}

            {otherReports.length ? (
              <div className="divide-y divide-border">
                {otherReports.map((doc) => (
                  <div key={doc.trigger_name} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <span className="text-sm font-medium">{doc.label}</span>
                      <p className="text-xs text-muted-foreground">JSF trigger: {doc.trigger_name}</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">{doc.trigger_name}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Alma did not expose any named certificate jobs on the study-service page during this fetch.
              </p>
            )}
          </CardContent>
        </Card>
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "Documents could not load.";
    return <AppShell title="Documents"><ErrorPanel title="Documents unavailable" message={message} /></AppShell>;
  }
}
