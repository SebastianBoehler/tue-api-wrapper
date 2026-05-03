import type { AlmaCourseDetail } from "./course-types";

export interface DashboardMetric {
  label: string;
  value: string | number;
}

export interface DashboardAgendaItem {
  summary: string;
  start: string;
  end?: string | null;
  location?: string | null;
  description?: string | null;
}

export interface DashboardTaskItem {
  title: string;
  item_type?: string | null;
  start?: string | null;
  end?: string | null;
  url: string;
}

export interface DashboardMembershipItem {
  title: string;
  description?: string | null;
  kind?: string | null;
  url: string;
  properties: string[];
}

export interface DashboardExamItem {
  title: string;
  number?: string | null;
  cp?: string | null;
  status?: string | null;
  grade?: string | null;
}

export interface AlmaCourseSlot {
  weekday: number;
  weekday_label: string;
  start_time: string;
  end_time?: string | null;
  location?: string | null;
}

export interface AlmaTimetableCourseAssignment {
  summary: string;
  occurrence_count: number;
  slots: AlmaCourseSlot[];
  number?: string | null;
  title?: string | null;
  event_type?: string | null;
  organization?: string | null;
  detail_url?: string | null;
  credits?: number | null;
  credit_source?: string | null;
  detail?: AlmaCourseDetail | null;
  error?: string | null;
}

export interface DashboardMailItem {
  uid: string;
  subject: string;
  from_name?: string | null;
  from_address?: string | null;
  preview?: string | null;
  is_unread?: boolean;
}

export interface DashboardTalkItem {
  id: number;
  title: string;
  timestamp: string;
  location?: string | null;
  speaker_name?: string | null;
  source_url: string;
  tags: Array<{
    id: number;
    name: string;
  }>;
}

export interface DashboardTalksPanel {
  available: boolean;
  sourceUrl: string;
  totalHits: number;
  items: DashboardTalkItem[];
  error?: string | null;
}

export interface DashboardDocumentsPanel {
  reports: DashboardDocumentReport[];
  currentDownloadAvailable: boolean;
  currentDownloadUrl?: string | null;
}

export interface DashboardDocumentReport {
  label: string;
  trigger_name: string;
}

export interface DashboardData {
  generatedAt: string;
  termLabel: string;
  hero: {
    title: string;
    subtitle: string;
  };
  metrics: DashboardMetric[];
  agenda: {
    exportUrl?: string | null;
    items: DashboardAgendaItem[];
  };
  study: {
    selectedTerm?: string | null;
    trackedCredits: number;
    passedExamCount: number;
    currentSemesterCredits?: number | null;
    currentSemesterCreditCourses?: number;
    currentSemesterCreditUnresolved?: string[];
    currentSemesterCreditError?: string | null;
    currentSemesterCourses?: AlmaTimetableCourseAssignment[];
  };
  documents: DashboardDocumentsPanel;
  exams: DashboardExamItem[];
  ilias: {
    memberships: DashboardMembershipItem[];
    tasks: DashboardTaskItem[];
  };
  mail: {
    available: boolean;
    unreadCount: number;
    items: DashboardMailItem[];
    error?: string | null;
  };
  talks: DashboardTalksPanel;
}

export interface AlmaCourseAssignmentsPage {
  total_credits: number;
  resolved_credit_count: number;
  unresolved_credit_summaries: string[];
  courses: AlmaTimetableCourseAssignment[];
}
