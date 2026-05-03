export interface CourseDiscoveryDocument {
  id: string;
  source: string;
  kind: string;
  title: string;
  text: string;
  url: string | null;
  module_code: string | null;
  degree: string | null;
  term: string | null;
  instructors: string[];
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface CourseDiscoveryResult {
  document: CourseDiscoveryDocument;
  score: number;
  match_reason: string;
}

export interface CourseDiscoveryStatus {
  document_count: number;
  semantic_available: boolean;
  vector_store: string;
  embedding_model: string | null;
  last_refresh: string | null;
  errors: string[];
}

export interface CourseDiscoverySearchResponse {
  query: string;
  results: CourseDiscoveryResult[];
  status: CourseDiscoveryStatus;
  errors: string[];
}
