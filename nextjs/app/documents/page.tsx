import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildPortalApiUrl, getDocuments, PortalApiError } from "../../lib/portal-api";
import { Download, FileText } from "lucide-react";

export default async function DocumentsPage() {
  try {
    const documents = await getDocuments();

    return (
      <AppShell title="Documents">
        {/* Download status */}
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
                <p className="text-xs text-muted-foreground">Alma is not currently rendering a direct download link.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Report jobs</CardTitle>
            <CardDescription>{documents.reports.length} available</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {documents.reports.map((doc) => (
                <div key={doc.trigger_name} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium">{doc.label}</span>
                  <Badge variant="secondary" className="font-mono text-xs">{doc.trigger_name}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "Documents could not load.";
    return <AppShell title="Documents"><ErrorPanel title="Documents unavailable" message={message} /></AppShell>;
  }
}
