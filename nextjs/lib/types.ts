export interface Metric {
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

export interface DocumentReport {
  label: string;
  trigger_name: string;
}

export interface ExamItem {
  level: number;
  kind: string | null;
  title: string;
  number: string | null;
  attempt: string | null;
  grade: string | null;
  cp: string | null;
  status: string | null;
}

export interface PortalLink {
  label: string;
  url: string;
}

export interface EnrollmentState {
  selected_term: string | null;
  available_terms: Record<string, string>;
  message: string | null;
}

export interface DashboardData {
  generatedAt: string;
  termLabel: string;
  hero: {
    title: string;
    subtitle: string;
  };
  metrics: Metric[];
  agenda: {
    exportUrl: string;
    items: AgendaItem[];
  };
  documents: DocumentReport[];
  exams: ExamItem[];
  enrollment: EnrollmentState;
  ilias: {
    title: string;
    mainbarLinks: PortalLink[];
    topCategories: PortalLink[];
  };
}
