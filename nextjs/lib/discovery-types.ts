import type { AgendaItem, CatalogNode } from "./types";

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

export interface AlmaTimetableOption {
  value: string;
  label: string;
  is_selected: boolean;
}

export interface AlmaTimetableDay {
  label: string;
  iso_date: string | null;
  restrict_view_name: string | null;
  note: string | null;
}

export interface AlmaTimetableView {
  page_url: string;
  selected_term_value: string | null;
  selected_term_label: string | null;
  selected_range_mode_value: string | null;
  selected_range_mode_label: string | null;
  selected_week_value: string | null;
  selected_week_label: string | null;
  visible_range_start: string | null;
  visible_range_end: string | null;
  source_export_url: string | null;
  calendar_feed_url: string | null;
  can_refresh_export_url: boolean;
  can_print_pdf: boolean;
  supports_custom_range: boolean;
  terms: AlmaTimetableOption[];
  range_modes: AlmaTimetableOption[];
  weeks: AlmaTimetableOption[];
  days: AlmaTimetableDay[];
  occurrences: AgendaItem[];
}

export interface AlmaTimetableExportLink {
  page_url: string;
  selected_term_value: string | null;
  selected_term_label: string | null;
  source_export_url: string | null;
  calendar_feed_url: string | null;
  can_refresh_export_url: boolean;
}

export interface AlmaDocumentReport {
  label: string;
  trigger_name: string;
}

export interface AlmaPortalMessagesFeed {
  page_url: string;
  feed_url: string | null;
  can_refresh_feed: boolean;
}

export interface AlmaCourseCatalogTermOption {
  value: string;
  label: string;
  is_selected: boolean;
}

export interface AlmaCourseCatalogPage {
  page_url: string;
  selected_term_value: string | null;
  selected_term_label: string | null;
  term_options: AlmaCourseCatalogTermOption[];
  nodes: CatalogNode[];
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

export interface IliasActionResult {
  status: string;
  message: string | null;
  final_url: string;
}

export interface IliasWaitlistSupport {
  supported: boolean;
  requires_agreement: boolean;
  join_url: string | null;
  message: string | null;
}

export interface IliasWaitlistResult {
  status: string;
  message: string | null;
  final_url: string;
  waitlist_position: number | null;
  requires_agreement: boolean;
}
