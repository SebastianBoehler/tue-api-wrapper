import type { IliasSearchResult } from "./discovery-types";
import type { ModuleDetail } from "./types";

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
