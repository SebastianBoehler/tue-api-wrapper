import type { IliasSearchResult } from "./ilias.js";

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

export interface AuthenticatedCourseSearchTermOption {
  value: string;
  label: string;
  is_selected: boolean;
}

export interface AuthenticatedCourseSearchResult {
  number: string | null;
  title: string;
  event_type: string | null;
  responsible_lecturer: string | null;
  lecturer: string | null;
  organization: string | null;
  detail_url: string | null;
}

export interface AuthenticatedCourseSearchResponse {
  page_url: string;
  query: string;
  selected_term_value: string | null;
  selected_term_label: string | null;
  term_options: AuthenticatedCourseSearchTermOption[];
  results: AuthenticatedCourseSearchResult[];
}

export interface AlmaDetailField {
  label: string;
  value: string;
}

export interface AlmaDetailSection {
  title: string;
  fields: AlmaDetailField[];
}

export interface AlmaDetailTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ModuleDetail {
  title: string;
  number: string | null;
  permalink: string | null;
  source_url: string;
  active_tab: string | null;
  available_tabs: string[];
  sections: AlmaDetailSection[];
  module_study_program_tables: AlmaDetailTable[];
}

export interface CourseDetailLookupQuery {
  portal: string;
  query: string;
  reason: string;
  result_count: number;
  error: string | null;
}

export interface CourseRegistrationHint {
  source: string;
  label: string;
  text: string;
}

export interface RelatedIliasResult {
  result: IliasSearchResult;
  match_query: string;
  match_reason: string;
  score: number;
  matched_identifier: string | null;
}

export interface UnifiedCourseDetail {
  alma: ModuleDetail;
  ilias_results: RelatedIliasResult[];
  lookup_queries: CourseDetailLookupQuery[];
  registration_hints: CourseRegistrationHint[];
  ilias_error: string | null;
}

export interface AlmaStudyPlannerSemester {
  index: number;
  label: string;
  term_label: string | null;
}

export interface AlmaStudyPlannerModule {
  row_index: number;
  column_start: number;
  column_span: number;
  title: string;
  number: string | null;
  credits_summary: string | null;
  detail_url: string | null;
  is_expandable: boolean;
}

export interface AlmaStudyPlannerViewState {
  show_recommended_plan: boolean;
  show_my_modules: boolean;
  show_alternative_semesters: boolean;
}

export interface AlmaStudyPlannerPayload {
  title: string;
  page_url: string;
  semesters: AlmaStudyPlannerSemester[];
  modules: AlmaStudyPlannerModule[];
  view_state: AlmaStudyPlannerViewState;
}
