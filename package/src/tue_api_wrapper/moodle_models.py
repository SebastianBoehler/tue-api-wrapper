from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class MoodlePageConfig:
    sesskey: str
    user_id: int | None
    course_id: int | None
    context_id: int | None


@dataclass(frozen=True)
class MoodleDashboardEvent:
    id: int | None
    title: str
    due_at: str | None
    formatted_time: str | None
    course_name: str | None
    course_id: int | None
    action_url: str | None
    description: str | None
    is_actionable: bool


@dataclass(frozen=True)
class MoodleRecentItem:
    id: int | None
    title: str
    item_type: str | None
    course_name: str | None
    course_id: int | None
    url: str | None
    icon_url: str | None


@dataclass(frozen=True)
class MoodleCourseSummary:
    id: int | None
    title: str
    shortname: str | None
    category_name: str | None
    visible: bool | None
    end_date: str | None
    url: str | None
    image_url: str | None
    summary: str | None = None
    teachers: tuple[str, ...] = ()


@dataclass(frozen=True)
class MoodleCoursesPage:
    source_url: str
    items: tuple[MoodleCourseSummary, ...]
    next_offset: int | None = None


@dataclass(frozen=True)
class MoodleCategorySummary:
    id: int | None
    title: str
    url: str
    description: str | None
    course_count: int | None


@dataclass(frozen=True)
class MoodleCategoryPage:
    category_id: int | None
    title: str
    source_url: str
    categories: tuple[MoodleCategorySummary, ...]
    courses: tuple[MoodleCourseSummary, ...]


@dataclass(frozen=True)
class MoodleCourseDetail:
    id: int | None
    title: str
    source_url: str
    course_url: str | None
    summary: str | None
    teachers: tuple[str, ...]
    self_enrolment_available: bool
    requires_enrolment_key: bool
    enrolment_label: str | None
    enrolment_action_url: str | None
    enrolment_payload: dict[str, str] = field(default_factory=dict)
    enrolment_key_field_name: str | None = None


@dataclass(frozen=True)
class MoodleEnrolmentResult:
    success: bool
    page_url: str
    course_id: int | None
    course_url: str | None
    title: str | None
    message: str | None


@dataclass(frozen=True)
class MoodleCalendarPage:
    source_url: str
    from_timestamp: int
    to_timestamp: int
    items: tuple[MoodleDashboardEvent, ...]


@dataclass(frozen=True)
class MoodleDashboardPage:
    source_url: str
    events: tuple[MoodleDashboardEvent, ...]
    recent_items: tuple[MoodleRecentItem, ...]
    courses: tuple[MoodleCourseSummary, ...]


@dataclass(frozen=True)
class MoodleGradeItem:
    course_title: str
    grade: str | None
    percentage: str | None
    range_hint: str | None
    rank: str | None
    feedback: str | None
    url: str | None


@dataclass(frozen=True)
class MoodleGradesPage:
    source_url: str
    items: tuple[MoodleGradeItem, ...]


@dataclass(frozen=True)
class MoodleMessageItem:
    title: str
    preview: str | None
    sender: str | None
    timestamp: str | None
    url: str | None
    unread: bool | None


@dataclass(frozen=True)
class MoodleMessagesPage:
    source_url: str
    items: tuple[MoodleMessageItem, ...]


@dataclass(frozen=True)
class MoodleNotificationItem:
    title: str
    body: str | None
    timestamp: str | None
    url: str | None
    unread: bool | None


@dataclass(frozen=True)
class MoodleNotificationsPage:
    source_url: str
    items: tuple[MoodleNotificationItem, ...]
