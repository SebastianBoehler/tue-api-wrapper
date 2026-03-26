import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPortalApiUrl } from "../lib/portal-api";
import type { MoodleCourseDetail, MoodleMessagesResponse, MoodleNotificationsResponse } from "../lib/types";

export function MoodleSidebar({
  courseDetail,
  messages,
  notifications
}: {
  courseDetail: MoodleCourseDetail | null;
  messages: MoodleMessagesResponse;
  notifications: MoodleNotificationsResponse;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>Course detail</CardTitle>
          <CardDescription>{courseDetail ? "Self-enrolment preview and teaching staff." : "Select a course from the dashboard or category explorer."}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {courseDetail ? (
            <>
              <div>
                <p className="text-sm font-medium">{courseDetail.title}</p>
                {courseDetail.summary ? <p className="text-sm text-muted-foreground mt-1">{courseDetail.summary}</p> : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={courseDetail.self_enrolment_available ? "default" : "secondary"}>
                  {courseDetail.self_enrolment_available ? "Self enrol available" : "No self enrol form"}
                </Badge>
                <Badge variant="outline">
                  {courseDetail.requires_enrolment_key ? "Enrolment key required" : "No enrolment key required"}
                </Badge>
              </div>
              {courseDetail.teachers.length ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Teachers</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {courseDetail.teachers.map((teacher) => <Badge key={teacher} variant="secondary">{teacher}</Badge>)}
                  </div>
                </div>
              ) : null}
              <div className="flex gap-2">
                {courseDetail.course_url ? <Button variant="outline" asChild><a href={courseDetail.course_url}>Open course</a></Button> : null}
                <Button variant="outline" asChild><a href={buildPortalApiUrl(courseDetail.source_url)}>Open enrol page</a></Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Course detail loads from the dedicated Moodle course endpoint and shows the same self-enrol metadata the backend exposes.</p>
          )}
        </CardContent>
      </Card>

      <FeedCard title="Messages" description="Moodle conversation overview.">
        {messages.items.map((item) => (
          <a key={`${item.title}-${item.timestamp}`} href={item.url ?? buildPortalApiUrl(messages.source_url)} className="block rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{item.title}</p>
              {item.unread ? <Badge variant="default">Unread</Badge> : null}
            </div>
            {item.preview ? <p className="text-xs text-muted-foreground mt-1">{item.preview}</p> : null}
            {item.timestamp ? <p className="text-xs text-muted-foreground mt-1">{item.timestamp}</p> : null}
          </a>
        ))}
        {!messages.items.length ? <p className="text-sm text-muted-foreground">No Moodle conversations were visible on the current page.</p> : null}
      </FeedCard>

      <FeedCard title="Notifications" description="Popup notification overview.">
        {notifications.items.map((item) => (
          <a key={`${item.title}-${item.timestamp}`} href={item.url ?? buildPortalApiUrl(notifications.source_url)} className="block rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{item.title}</p>
              {item.unread ? <Badge variant="default">Unread</Badge> : null}
            </div>
            {item.body ? <p className="text-xs text-muted-foreground mt-1">{item.body}</p> : null}
            {item.timestamp ? <p className="text-xs text-muted-foreground mt-1">{item.timestamp}</p> : null}
          </a>
        ))}
        {!notifications.items.length ? <p className="text-sm text-muted-foreground">No Moodle notifications were visible on the current page.</p> : null}
      </FeedCard>
    </div>
  );
}

function FeedCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}
