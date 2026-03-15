function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function many(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  return value ? [value.trim()].filter(Boolean) : [];
}

export function parseCourseDiscoveryParams(
  searchParams: Record<string, string | string[] | undefined>
) {
  return {
    query: first(searchParams.course_query).trim(),
    term: first(searchParams.course_term).trim()
  };
}

export function parseIliasSearchParams(
  searchParams: Record<string, string | string[] | undefined>
) {
  return {
    term: first(searchParams.query).trim(),
    searchMode: first(searchParams.search_mode).trim(),
    contentTypes: many(searchParams.content_type),
    createdEnabled: first(searchParams.created_enabled).trim() === "true",
    createdMode: first(searchParams.created_mode).trim(),
    createdDate: first(searchParams.created_date).trim()
  };
}
