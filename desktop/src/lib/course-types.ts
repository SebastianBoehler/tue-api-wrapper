export interface CourseDetailField {
  label: string;
  value: string;
}

export interface CourseDetailSection {
  title: string;
  fields: CourseDetailField[];
}

export interface CourseDetailTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface CoursePortalStatus {
  portal: string;
  status: string;
  signed_up?: boolean | null;
  title?: string | null;
  url?: string | null;
  match_reason?: string | null;
  score?: number | null;
  message?: string | null;
  error?: string | null;
}

export interface UnifiedCourseDetail {
  alma: {
    title: string;
    number?: string | null;
    permalink?: string | null;
    source_url: string;
    active_tab?: string | null;
    available_tabs: string[];
    sections: CourseDetailSection[];
    module_study_program_tables: CourseDetailTable[];
  };
  portal_statuses: CoursePortalStatus[];
  registration_hints: Array<{ source: string; label: string; text: string }>;
  ilias_results: Array<{
    match_query: string;
    match_reason: string;
    score: number;
    result: { title: string; url: string; type_label?: string | null };
  }>;
  ilias_error?: string | null;
}
