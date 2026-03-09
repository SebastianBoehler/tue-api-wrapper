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

export interface DocumentsPanel {
  reports: DocumentReport[];
  currentDownloadAvailable: boolean;
  currentDownloadUrl: string | null;
  sourcePageUrl: string;
}

export interface CatalogNode {
  level: number;
  kind: string | null;
  title: string;
  description: string | null;
  permalink: string | null;
  expandable: boolean;
}

export interface CatalogPanel {
  nodes: CatalogNode[];
  sourcePageUrl: string;
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

export interface ModuleSearchResult {
  number: string | null;
  title: string;
  element_type: string | null;
  detail_url: string | null;
}

export interface SearchOption {
  value: string;
  label: string;
}

export interface ModuleSearchFiltersResponse {
  sourcePageUrl: string;
  filters: {
    elementTypes: SearchOption[];
    languages: SearchOption[];
    degrees: SearchOption[];
    subjects: SearchOption[];
    faculties: SearchOption[];
  };
}

export interface ModuleSearchResponse {
  results: ModuleSearchResult[];
  returnedResults: number;
  totalResults: number | null;
  totalPages: number | null;
  truncated: boolean;
  sourcePageUrl: string;
}

export interface AlmaDetailField {
  label: string;
  value: string;
}

export interface AlmaDetailSection {
  title: string;
  fields: AlmaDetailField[];
}

export interface ModuleDetail {
  title: string;
  number: string | null;
  permalink: string | null;
  source_url: string;
  active_tab: string | null;
  available_tabs: string[];
  sections: AlmaDetailSection[];
}

export interface IliasContentItem {
  label: string;
  url: string;
  kind: string | null;
  properties: string[];
}

export interface IliasContentSection {
  label: string;
  items: IliasContentItem[];
}

export interface IliasContentPage {
  title: string;
  page_url: string;
  sections: IliasContentSection[];
}

export interface IliasForumTopic {
  title: string;
  url: string;
  author: string | null;
  posts: string | null;
  last_post: string | null;
  visits: string | null;
}

export interface IliasExerciseAssignment {
  title: string;
  url: string;
  due_hint: string | null;
  due_at: string | null;
  requirement: string | null;
  last_submission: string | null;
  submission_type: string | null;
  status: string | null;
  team_action_url: string | null;
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
  documents: DocumentsPanel;
  catalog: CatalogPanel;
  exams: ExamItem[];
  enrollment: EnrollmentState;
  ilias: {
    title: string;
    mainbarLinks: PortalLink[];
    topCategories: PortalLink[];
  };
}
