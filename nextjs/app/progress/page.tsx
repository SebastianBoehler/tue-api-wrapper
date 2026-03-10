import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAlmaEnrollment, getAlmaExams, PortalApiError } from "../../lib/portal-api";
import type { ExamItem } from "../../lib/types";

function isActionableExamRow(exam: ExamItem): boolean {
  return Boolean(exam.number || exam.grade || exam.status || exam.cp || exam.attempt);
}

function isPassedExam(exam: ExamItem): boolean {
  const normalizedStatus = (exam.status ?? "").trim().toUpperCase();
  const normalizedGrade = (exam.grade ?? "").trim();
  return (
    normalizedStatus === "BE" ||
    normalizedStatus === "PASSED" ||
    normalizedStatus === "BESTANDEN" ||
    (normalizedGrade !== "" && normalizedGrade !== "-" && normalizedGrade !== "5,0")
  );
}

export default async function ProgressPage() {
  try {
    const [enrollment, exams] = await Promise.all([getAlmaEnrollment(), getAlmaExams(50)]);
    const actionableExams = exams.filter(isActionableExamRow);
    const gradedExams = actionableExams.filter((exam) => exam.grade && exam.grade !== "-");
    const passedExamCount = actionableExams.filter(isPassedExam).length;
    const trackedCredits = actionableExams
      .map((exam) => Number.parseFloat((exam.cp ?? "0").replace(",", ".")))
      .filter((value) => Number.isFinite(value))
      .reduce((sum, value) => sum + value, 0)
      .toFixed(1);
    const openOrPending = actionableExams.filter((exam) => !exam.grade || exam.grade === "-");

    return (
      <AppShell title="Progress">
        <div className="grid grid-cols-3 gap-3">
          <Card size="sm">
            <CardContent>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected term</p>
              <p className="text-xl font-semibold tracking-tight mt-1">{enrollment.selected_term ?? "Unknown"}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Passed exams</p>
              <p className="text-xl font-semibold tracking-tight mt-1">{passedExamCount}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tracked credits</p>
              <p className="text-xl font-semibold tracking-tight mt-1">{trackedCredits}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exam records</CardTitle>
            <CardDescription>Directly extracted from Alma&apos;s authenticated exam overview, without relying on a PDF transcript export.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {actionableExams.map((exam) => (
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

        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Graded items</CardTitle>
              <CardDescription>Rows where Alma already exposes a grade.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {gradedExams.length ? gradedExams.map((exam) => (
                  <div key={`graded-${exam.number}-${exam.title}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{exam.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[exam.number, exam.cp ? `${exam.cp} CP` : null, exam.attempt ? `Attempt ${exam.attempt}` : null]
                          .filter(Boolean)
                          .join(" · ") || "No structured metadata"}
                      </p>
                    </div>
                    <Badge variant="outline">{exam.grade}</Badge>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No graded items are currently exposed.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending items</CardTitle>
              <CardDescription>Rows that look active but do not yet expose a final grade.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {openOrPending.length ? openOrPending.map((exam) => (
                  <div key={`pending-${exam.number}-${exam.title}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{exam.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[exam.number, exam.cp ? `${exam.cp} CP` : null, exam.attempt ? `Attempt ${exam.attempt}` : null]
                          .filter(Boolean)
                          .join(" · ") || "No structured metadata"}
                      </p>
                    </div>
                    {exam.status ? <Badge variant="secondary">{exam.status}</Badge> : <Badge variant="secondary">Open</Badge>}
                  </div>
                )) : <p className="text-sm text-muted-foreground">No pending exam rows are currently exposed.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enrollment</CardTitle>
            <CardDescription>Term status from Alma.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{enrollment.message ?? "No Alma enrollment message was exposed."}</p>
          </CardContent>
        </Card>
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "Progress could not load.";
    return <AppShell title="Progress"><ErrorPanel title="Progress unavailable" message={message} /></AppShell>;
  }
}
