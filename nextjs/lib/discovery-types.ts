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

export interface AlmaStudyPlannerResponse {
  title: string;
  page_url: string;
  semesters: AlmaStudyPlannerSemester[];
  modules: AlmaStudyPlannerModule[];
  view_state: AlmaStudyPlannerViewState;
}

export interface AlmaCourseSearchTermOption {
  value: string;
  label: string;
  is_selected: boolean;
}

export interface AlmaCourseSearchResult {
  number: string | null;
  title: string;
  event_type: string | null;
  responsible_lecturer: string | null;
  lecturer: string | null;
  organization: string | null;
  detail_url: string | null;
}

export interface AlmaCourseSearchResponse {
  page_url: string;
  query: string;
  selected_term_value: string | null;
  selected_term_label: string | null;
  term_options: AlmaCourseSearchTermOption[];
  results: AlmaCourseSearchResult[];
}

export interface IliasSearchOption {
  value: string;
  label: string;
  is_selected: boolean;
}

export interface IliasSearchFilters {
  area_value: string | null;
  area_label: string | null;
  search_modes: IliasSearchOption[];
  content_types: IliasSearchOption[];
  creation_modes: IliasSearchOption[];
  creation_enabled: boolean;
  creation_date: string | null;
}

export interface IliasSearchResult {
  title: string;
  url: string | null;
  description: string | null;
  info_url: string | null;
  add_to_favorites_url: string | null;
  breadcrumbs: string[];
  properties: string[];
  item_type: string | null;
}

export interface IliasSearchResponse {
  page_url: string;
  query: string;
  page_number: number;
  previous_page_url: string | null;
  next_page_url: string | null;
  filters: IliasSearchFilters;
  results: IliasSearchResult[];
}
