export interface SearchItem {
  id: string;
  title: string;
  url: string;
  text: string;
  metadata?: Record<string, string>;
}

export interface DashboardPayload {
  generatedAt: string;
  termLabel: string;
  hero: {
    title: string;
    subtitle: string;
  };
  metrics: Array<{
    label: string;
    value: number;
  }>;
  agenda: {
    exportUrl: string;
    items: Array<{
      summary: string;
      start: string;
      end: string | null;
      location: string | null;
      description: string | null;
    }>;
  };
  documents: Array<{
    label: string;
    trigger_name: string;
  }>;
  exams: Array<{
    title: string;
    number: string | null;
    grade: string | null;
    status: string | null;
  }>;
  ilias: {
    title: string;
    mainbarLinks: Array<{
      label: string;
      url: string;
    }>;
    topCategories: Array<{
      label: string;
      url: string;
    }>;
  };
}
