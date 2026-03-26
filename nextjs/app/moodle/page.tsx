import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { MoodleHub } from "../../components/moodle-hub";
import {
  getMoodleCalendar,
  getMoodleCategories,
  getMoodleCourseDetail,
  getMoodleDashboard,
  getMoodleGrades,
  getMoodleMessages,
  getMoodleNotifications,
  PortalApiError
} from "../../lib/portal-api";

function parseOptionalInt(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function MoodlePage({
  searchParams
}: {
  searchParams?: Promise<{ categoryId?: string; courseId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedCategoryId = parseOptionalInt(params.categoryId);
  const selectedCourseId = parseOptionalInt(params.courseId);

  try {
    const [dashboard, calendar, grades, messages, notifications, categories, courseDetail] = await Promise.all([
      getMoodleDashboard(),
      getMoodleCalendar(30, 20),
      getMoodleGrades(12),
      getMoodleMessages(10),
      getMoodleNotifications(10),
      getMoodleCategories(selectedCategoryId),
      selectedCourseId !== undefined ? getMoodleCourseDetail(selectedCourseId) : Promise.resolve(null)
    ]);

    return (
      <AppShell title="Moodle">
        <MoodleHub
          dashboard={dashboard}
          calendar={calendar}
          grades={grades}
          messages={messages}
          notifications={notifications}
          categories={categories}
          courseDetail={courseDetail}
          selectedCategoryId={selectedCategoryId}
        />
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "The Moodle integration could not load live portal data.";
    return (
      <AppShell title="Moodle">
        <ErrorPanel title="Backend unavailable" message={message} />
      </AppShell>
    );
  }
}
