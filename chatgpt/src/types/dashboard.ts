import type {
  IliasLink,
  IliasMembershipItem,
  IliasTaskItem,
} from "./ilias.js";

export interface DashboardMetric {
  label: string;
  value: number;
}

export interface CalendarRoomDetails {
  room_default: string | null;
  room_short: string | null;
  room_long: string | null;
  floor_default: string | null;
  floor_short: string | null;
  floor_long: string | null;
  building_default: string | null;
  building_short: string | null;
  building_long: string | null;
  campus_default: string | null;
  campus_short: string | null;
  campus_long: string | null;
  detail_url: string | null;
  display_text: string | null;
}

export interface AgendaItem {
  summary: string;
  start: string;
  end: string | null;
  location: string | null;
  description: string | null;
  room_details?: CalendarRoomDetails | null;
}

export interface AlmaTimetableEvent {
  summary: string;
  start: string;
  end: string | null;
  location: string | null;
  description: string | null;
  room_details?: CalendarRoomDetails | null;
  uid: string | null;
  recurrence_rule: string | null;
  excluded_starts: string[];
}

export interface AlmaTimetablePayload {
  term_label: string;
  term_id: string;
  export_url: string;
  raw_ics: string;
  events: AlmaTimetableEvent[];
  occurrences: AgendaItem[];
  available_terms: Record<string, string>;
}

export interface DocumentReport {
  label: string;
  trigger_name: string;
}

export interface StudyServiceTab {
  button_name: string;
  label: string;
  is_active: boolean;
}

export interface StudyServiceOutputRequest {
  trigger_name: string;
  label: string;
  count: number | null;
  message: string | null;
}

export interface DashboardDocumentsPanel {
  reports: DocumentReport[];
  currentDownloadAvailable: boolean;
  currentDownloadUrl: string | null;
  sourcePageUrl: string;
}

export interface DocumentsSummaryPayload extends DashboardDocumentsPanel {
  bannerText: string | null;
  personName: string | null;
  activeTabLabel: string | null;
  tabs: StudyServiceTab[];
  outputRequests: StudyServiceOutputRequest[];
}

export interface AlmaExamRecord {
  level: number;
  kind: string | null;
  title: string;
  number: string | null;
  attempt: string | null;
  grade: string | null;
  cp: string | null;
  malus: string | null;
  status: string | null;
  free_trial: string | null;
  remark: string | null;
  exception: string | null;
  release_date: string | null;
}

export interface QuickLink {
  label: string;
  href: string;
  description: string;
}

export interface DashboardTalkTag {
  id: number;
  name: string;
}

export interface DashboardTalkItem {
  id: number;
  title: string;
  timestamp: string;
  description: string | null;
  location: string | null;
  speaker_name: string | null;
  speaker_bio: string | null;
  disabled: boolean;
  source_url: string;
  tags: DashboardTalkTag[];
}

export interface DashboardTalksPanel {
  available: boolean;
  sourceUrl: string;
  totalHits: number;
  items: DashboardTalkItem[];
  error: string | null;
}

export interface DashboardPayload {
  generatedAt: string;
  termLabel: string;
  hero: {
    title: string;
    subtitle: string;
  };
  metrics: DashboardMetric[];
  agenda: {
    exportUrl: string;
    items: AgendaItem[];
  };
  study: {
    selectedTerm: string | null;
    message: string | null;
    passedExamCount: number;
    trackedCredits: number;
    currentSemesterCredits: number | null;
    currentSemesterCreditCourses: number;
    currentSemesterCreditUnresolved: string[];
    currentSemesterCreditError: string | null;
    availableTerms: Record<string, string>;
  };
  documents: DashboardDocumentsPanel;
  exams: AlmaExamRecord[];
  enrollment: {
    selected_term: string | null;
    available_terms: Record<string, string>;
    message: string | null;
  };
  ilias: {
    title: string;
    mainbarLinks: IliasLink[];
    topCategories: IliasLink[];
    memberships: IliasMembershipItem[];
    tasks: IliasTaskItem[];
  };
  quickLinks: QuickLink[];
  talks: DashboardTalksPanel;
}
