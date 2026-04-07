import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { ExamRecordsTabs } from "../../components/exam-records-tabs";
import { ListRow, ListRows } from "../../components/list-row";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
              <p className="text-3xl font-semibold tracking-tight mt-1">{enrollment.selected_term ?? "—"}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Passed exams</p>
              <p className="text-3xl font-semibold tracking-tight mt-1">{passedExamCount}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tracked credits</p>
              <p className="text-3xl font-semibold tracking-tight mt-1">{trackedCredits}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exam records</CardTitle>
            <CardDescription>
              Directly extracted from Alma&apos;s authenticated exam overview, without relying on a PDF transcript export.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExamRecordsTabs
              all={actionableExams}
              graded={gradedExams}
              pending={openOrPending}
            />
          </CardContent>
        </Card>

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
