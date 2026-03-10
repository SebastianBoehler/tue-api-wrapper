import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildAlmaDocumentUrl, buildPortalApiUrl, getDocuments, PortalApiError } from "../../lib/portal-api";
import { Download, FileText } from "lucide-react";

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
            <CardTitle>Transcript and grade exports</CardTitle>
            <CardDescription>
              If Alma exposes transcript-style report jobs, they appear here with direct API-backed downloads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transcriptReports.length ? (
              <div className="divide-y divide-border">
                {transcriptReports.map((doc) => (
                  <div key={`transcript-${doc.trigger_name}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{doc.label}</p>
                      <p className="text-xs text-muted-foreground">Document id: {doc.trigger_name}</p>
                    </div>
                    <Button size="sm" asChild>
                      <a href={buildAlmaDocumentUrl(doc.trigger_name)}>Download</a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No transcript-like export was exposed by Alma during this fetch. Grades are still shown directly on the Progress page.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report jobs</CardTitle>
            <CardDescription>{documents.reports.length} available</CardDescription>
          </CardHeader>
          <CardContent>
            {otherReports.length ? (
              <div className="divide-y divide-border">
                {otherReports.map((doc) => (
                  <div key={doc.trigger_name} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <span className="text-sm font-medium">{doc.label}</span>
                      <p className="text-xs text-muted-foreground">API download available via unofficial wrapper.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">{doc.trigger_name}</Badge>
                      <Button size="sm" variant="outline" asChild>
                        <a href={buildAlmaDocumentUrl(doc.trigger_name)}>Download</a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Alma did not expose any named report jobs on the study-service page during this fetch.
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
