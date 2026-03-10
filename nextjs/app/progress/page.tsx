import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboard, PortalApiError } from "../../lib/portal-api";

export default async function ProgressPage() {
  try {
    const dashboard = await getDashboard();

    return (
      <AppShell title="Progress">
        <div className="grid grid-cols-3 gap-3">
          <Card size="sm">
            <CardContent>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected term</p>
              <p className="text-xl font-semibold tracking-tight mt-1">{dashboard.study.selectedTerm ?? "Unknown"}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Passed exams</p>
              <p className="text-xl font-semibold tracking-tight mt-1">{dashboard.study.passedExamCount}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tracked credits</p>
              <p className="text-xl font-semibold tracking-tight mt-1">{dashboard.study.trackedCredits}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exam records</CardTitle>
            <CardDescription>Latest rows from Alma&apos;s authenticated exam overview.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {dashboard.exams.map((exam) => (
                <div key={`${exam.number}-${exam.title}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{exam.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {[exam.number, exam.cp ? `${exam.cp} CP` : null, exam.attempt ? `Attempt ${exam.attempt}` : null]
                        .filter(Boolean)
                        .join(" · ") || "No structured metadata"}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {exam.status ? <Badge variant="secondary">{exam.status}</Badge> : null}
                    {exam.grade ? <Badge variant="outline">{exam.grade}</Badge> : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollment</CardTitle>
            <CardDescription>Term status from Alma.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{dashboard.enrollment.message ?? "No Alma enrollment message was exposed."}</p>
          </CardContent>
        </Card>
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "Progress could not load.";
    return <AppShell title="Progress"><ErrorPanel title="Progress unavailable" message={message} /></AppShell>;
  }
}
