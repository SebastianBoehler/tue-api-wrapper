export const defaultStudyTerm = "Sommer 2026";

export function normalizeStudyTerm(term: string | null | undefined, fallback = defaultStudyTerm): string {
  const raw = term?.trim();
  if (!raw) {
    return fallback;
  }

  const cleaned = raw.replace(/\s+/g, " ").replace(/[.,;:]$/, "");
  const key = cleaned
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");

  const summerMatch = key.match(/^(?:sommer|summer|sommer semester|sommersemester|sommersemster|somersemester|sose|ss)\s*(\d{4})$/);
  if (summerMatch) {
    return `Sommer ${summerMatch[1]}`;
  }

  const winterMatch = key.match(/^(?:winter|winter semester|wintersemester|wise|ws)\s*(\d{4})(?:\s*\/?\s*(\d{2,4}))?$/);
  if (winterMatch) {
    const startYear = winterMatch[1];
    const endYear = winterMatch[2] ?? String((Number(startYear) + 1) % 100).padStart(2, "0");
    return `Winter ${startYear}/${endYear.slice(-2)}`;
  }

  return cleaned;
}

export function normalizeOptionalStudyTerm(term: string | null | undefined): string | undefined {
  return term?.trim() ? normalizeStudyTerm(term) : undefined;
}
