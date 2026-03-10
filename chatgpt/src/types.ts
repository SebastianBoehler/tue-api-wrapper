export interface SearchItem {
  id: string;
  title: string;
  url: string;
  text: string;
  metadata?: Record<string, string>;
}

export interface DashboardMetric {
  label: string;
  value: number;
}

export interface AgendaItem {
  summary: string;
  start: string;
  end: string | null;
  location: string | null;
  description: string | null;
}

export interface AlmaTimetableEvent {
  summary: string;
  start: string;
  end: string | null;
  location: string | null;
  description: string | null;
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

export interface IliasLink {
  label: string;
  url: string;
}

export interface IliasMembershipItem {
  title: string;
  url: string;
  kind: string | null;
  description: string | null;
  info_url: string | null;
  properties: string[];
}

export interface IliasTaskItem {
  title: string;
  url: string;
  item_type: string | null;
  start: string | null;
  end: string | null;
}

export interface QuickLink {
  label: string;
  href: string;
  description: string;
}

export interface AlmaSearchOption {
  value: string;
  label: string;
}

export interface AlmaCourseSearchResult {
  number: string | null;
  title: string;
  element_type: string | null;
  detail_url: string | null;
}

export interface AlmaCourseSearchFiltersPayload {
  sourcePageUrl: string;
  filters: {
    elementTypes: AlmaSearchOption[];
    languages: AlmaSearchOption[];
    degrees: AlmaSearchOption[];
    subjects: AlmaSearchOption[];
    faculties: AlmaSearchOption[];
  };
}

export interface AlmaCourseSearchResponse {
  results: AlmaCourseSearchResult[];
  returnedResults: number;
  totalResults: number | null;
  totalPages: number | null;
  truncated: boolean;
  sourcePageUrl: string;
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
    availableTerms: Record<string, string>;
  };
  documents: {
    reports: DocumentReport[];
    currentDownloadAvailable: boolean;
    currentDownloadUrl: string | null;
    sourcePageUrl: string;
  };
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
}
