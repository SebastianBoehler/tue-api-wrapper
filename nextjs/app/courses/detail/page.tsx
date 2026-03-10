import Link from "next/link";
import { AppShell } from "../../../components/app-shell";
import { ErrorPanel } from "../../../components/error-panel";
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getModuleDetail, PortalApiError } from "../../../lib/portal-api";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default async function CourseDetailPage({ searchParams }: { searchParams?: Promise<{ url?: string }> }) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const detailUrl = resolvedSearchParams.url?.trim();

  if (!detailUrl) {
    return <AppShell title="Course Detail"><ErrorPanel title="Missing URL" message="No Alma detail URL was provided." /></AppShell>;
  }

  try {
    const detail = await getModuleDetail(detailUrl);

    return (
      <AppShell title="Course Detail">
        <Card>
          <CardHeader>
            <div>
              <CardDescription>{detail.number}</CardDescription>
              <CardTitle className="text-lg">{detail.title}</CardTitle>
            </div>
            <CardAction className="flex gap-2">
              <Button variant="secondary" size="sm" asChild><Link href="/courses"><ArrowLeft className="size-3.5" />Back</Link></Button>
              {detail.permalink ? <Button variant="outline" size="sm" asChild><a href={detail.permalink}><ExternalLink className="size-3.5" />Source</a></Button> : null}
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {detail.available_tabs.map((tab) => (
                <Badge key={tab} variant={tab === detail.active_tab ? "default" : "outline"}>{tab}</Badge>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {detail.sections.map((section) => (
                <div key={section.title} className="border border-border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">{section.title}</p>
                  <div className="flex flex-col gap-2">
                    {section.fields.map((field) => (
                      <div key={`${section.title}-${field.label}`}>
                        <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">{field.label}</span>
                        <p className="text-sm leading-snug font-medium">{field.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  } catch (error: unknown) {
    const message = error instanceof PortalApiError ? error.message : "Course detail could not load.";
    return <AppShell title="Course Detail"><ErrorPanel title="Unavailable" message={message} /></AppShell>;
  }
}
