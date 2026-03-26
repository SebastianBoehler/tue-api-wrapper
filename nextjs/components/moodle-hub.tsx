import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildPortalApiUrl } from "../lib/portal-api";
import { MoodleSidebar } from "./moodle-sidebar";
import type {
  MoodleCalendarData,
  MoodleCategoryPage,
  MoodleCourseDetail,
  MoodleDashboardData,
  MoodleGradesResponse,
  MoodleMessagesResponse,
  MoodleNotificationsResponse
} from "../lib/types";

function formatIso(value: string | null) {
  if (!value) {
    return "Pending";
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatTimestamp(value: number) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium"
  }).format(new Date(value * 1000));
}

export function MoodleHub({
  dashboard,
  calendar,
  grades,
  messages,
  notifications,
  categories,
  courseDetail,
  selectedCategoryId
}: {
  dashboard: MoodleDashboardData;
  calendar: MoodleCalendarData;
  grades: MoodleGradesResponse;
  messages: MoodleMessagesResponse;
  notifications: MoodleNotificationsResponse;
  categories: MoodleCategoryPage;
  courseDetail: MoodleCourseDetail | null;
  selectedCategoryId?: number;
}) {
  return (
    <>
      <Card className="border-primary/15 bg-primary/5">
        <CardHeader>
          <div>
            <CardDescription>moodle.zdv.uni-tuebingen.de</CardDescription>
            <CardTitle className="text-2xl">Moodle hub</CardTitle>
          </div>
          <CardAction>
            <Button variant="outline" size="xs" asChild>
              <a href={buildPortalApiUrl(dashboard.source_url)} target="_blank" rel="noreferrer">
                Open Moodle
              </a>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <SummaryCard label="Upcoming events" value={dashboard.events.length} />
          <SummaryCard label="Recent items" value={dashboard.recent_items.length} />
          <SummaryCard label="Enrolled courses" value={dashboard.courses.length} />
          <SummaryCard label="Notifications" value={notifications.items.length} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-3">
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard snapshot</CardTitle>
              <CardDescription>Upcoming actions, recent learning context, and enrolled courses.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-3">
              <SectionList
                label="Upcoming"
                items={dashboard.events.map((item) => (
                  <a key={`${item.id}-${item.title}`} href={item.action_url ?? "#"} className="block rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.course_name ?? "Moodle"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.formatted_time ?? formatIso(item.due_at)}</p>
                  </a>
                ))}
              />
              <SectionList
                label="Recently accessed"
                items={dashboard.recent_items.map((item) => (
                  <a key={`${item.id}-${item.title}`} href={item.url ?? "#"} className="block rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.course_name ?? item.item_type ?? "Item"}</p>
                  </a>
                ))}
              />
              <SectionList
                label="Enrolled courses"
                items={dashboard.courses.map((course) => (
                  <Link
                    key={`${course.id}-${course.title}`}
                    href={`/moodle?courseId=${course.id ?? ""}${selectedCategoryId ? `&categoryId=${selectedCategoryId}` : ""}`}
                    className="block rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <p className="text-sm font-medium">{course.title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {course.shortname ? <Badge variant="secondary">{course.shortname}</Badge> : null}
                      {course.end_date ? <Badge variant="outline">Ends {formatIso(course.end_date)}</Badge> : null}
                    </div>
                  </Link>
                ))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category explorer</CardTitle>
              <CardDescription>Browse Moodle categories and jump into a course enrolment preview.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <form method="get" action="/moodle" className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label htmlFor="categoryId" className="text-xs uppercase tracking-wide text-muted-foreground">Category ID</label>
                  <Input id="categoryId" name="categoryId" defaultValue={selectedCategoryId ? String(selectedCategoryId) : ""} placeholder="e.g. 235" />
                </div>
                <Button type="submit">Load</Button>
              </form>
              <div className="grid gap-3 lg:grid-cols-2">
                <SectionList
                  label="Subcategories"
                  items={categories.categories.map((category) => (
                    <Link key={`${category.id}-${category.title}`} href={`/moodle?categoryId=${category.id ?? ""}`} className="block rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors">
                      <p className="text-sm font-medium">{category.title}</p>
                      {category.description ? <p className="text-xs text-muted-foreground mt-1">{category.description}</p> : null}
                    </Link>
                  ))}
                  emptyMessage="No visible subcategories on this page."
                />
                <SectionList
                  label="Courses"
                  items={categories.courses.map((course) => (
                    <Link
                      key={`${course.id}-${course.title}`}
                      href={`/moodle?courseId=${course.id ?? ""}${selectedCategoryId ? `&categoryId=${selectedCategoryId}` : ""}`}
                      className="block rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors"
                    >
                      <p className="text-sm font-medium">{course.title}</p>
                      {course.summary ? <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{course.summary}</p> : null}
                    </Link>
                  ))}
                  emptyMessage="No visible courses on this page."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calendar and grades</CardTitle>
              <CardDescription>30-day Moodle action window and grade overview.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              <SectionList
                label={`Calendar window ${formatTimestamp(calendar.from_timestamp)} to ${formatTimestamp(calendar.to_timestamp)}`}
                items={calendar.items.map((item) => (
                  <a key={`${item.id}-${item.title}`} href={item.action_url ?? "#"} className="block rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.course_name ?? "Moodle"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.formatted_time ?? formatIso(item.due_at)}</p>
                  </a>
                ))}
              />
              <SectionList
                label="Grades"
                items={grades.items.map((grade) => (
                  <a key={`${grade.course_title}-${grade.grade}`} href={grade.url ?? buildPortalApiUrl(grades.source_url)} className="block rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors">
                    <p className="text-sm font-medium">{grade.course_title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {grade.grade ? <Badge variant="secondary">{grade.grade}</Badge> : null}
                      {grade.percentage ? <Badge variant="outline">{grade.percentage}</Badge> : null}
                      {grade.range_hint ? <Badge variant="outline">{grade.range_hint}</Badge> : null}
                    </div>
                  </a>
                ))}
                emptyMessage="No grade rows were visible for this account."
              />
            </CardContent>
          </Card>
        </div>

        <MoodleSidebar courseDetail={courseDetail} messages={messages} notifications={notifications} />
      </div>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function SectionList({
  label,
  items,
  emptyMessage
}: {
  label: string;
  items: ReactNode[];
  emptyMessage?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {items.length ? items : emptyMessage ? <p className="text-sm text-muted-foreground">{emptyMessage}</p> : null}
    </div>
  );
}
