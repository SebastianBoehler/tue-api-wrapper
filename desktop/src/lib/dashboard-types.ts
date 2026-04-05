export interface DashboardMetric {
  label: string;
  value: string | number;
}

export interface DashboardAgendaItem {
  summary: string;
  start: string;
  end?: string | null;
  location?: string | null;
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

export interface DashboardMailItem {
  uid: string;
  subject: string;
  from_name?: string | null;
  from_address?: string | null;
  preview?: string | null;
  is_unread?: boolean;
}

export interface DashboardDocumentsPanel {
  reports: Array<{
    label: string;
    trigger_name: string;
  }>;
  currentDownloadAvailable: boolean;
  currentDownloadUrl?: string | null;
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
}
