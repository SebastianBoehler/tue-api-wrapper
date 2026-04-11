import { AppShell } from "../../../components/app-shell";
import { CourseDetailChooser } from "../../../components/course-detail-chooser";
import { CourseDetailContent } from "../../../components/course-detail-content";
import { ErrorPanel } from "../../../components/error-panel";
import {
  dedupeCourseSearchResults,
  normalizeCourseTitle
} from "../../../lib/alma-course-detail";
import { getUnifiedCourseDetail } from "../../../lib/course-detail-api";
import { getAlmaCourseSearch, PortalApiError } from "../../../lib/portal-api";

type SearchParamValue = string | string[] | undefined;

function readFirstSearchParam(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

function buildCourseSearchHref(title: string, term: string) {
  const params = new URLSearchParams();
  params.set("course_query", title);
  if (term) {
    params.set("course_term", term);
  }
  return `/courses?${params.toString()}`;
}

export default async function CourseDetailPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, SearchParamValue>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const detailUrl = readFirstSearchParam(resolvedSearchParams.url);
  const title = readFirstSearchParam(resolvedSearchParams.title);
  const term = readFirstSearchParam(resolvedSearchParams.term);

  if (!detailUrl && !title) {
    return (
      <AppShell title="Course Detail">
        <ErrorPanel title="Missing course reference" message="No Alma detail URL or event title was provided." />
      </AppShell>
    );
  }

  try {
    let resolvedDetailUrl = detailUrl;

    if (!resolvedDetailUrl) {
      const searchResponse = await getAlmaCourseSearch({
        query: title,
        term,
        limit: 12
      });
      const candidates = dedupeCourseSearchResults(searchResponse.results).filter(
        (result) => result.detail_url
      );
      const exactMatches = candidates.filter(
        (result) => normalizeCourseTitle(result.title) === normalizeCourseTitle(title)
      );

      if (exactMatches.length === 1) {
        resolvedDetailUrl = exactMatches[0].detail_url ?? "";
      } else if (exactMatches.length === 0 && candidates.length === 1) {
        resolvedDetailUrl = candidates[0].detail_url ?? "";
      } else if (candidates.length > 0) {
        return (
          <AppShell title="Course Detail">
            <CourseDetailChooser
              title={title}
              candidates={candidates}
              coursesHref={buildCourseSearchHref(title, term)}
              almaHref={searchResponse.page_url}
            />
          </AppShell>
        );
      } else {
        return (
          <AppShell title="Course Detail">
            <ErrorPanel
              title="Course detail unavailable"
              message={`No Alma course detail page matched “${title}”. Try the course search for a broader lookup.`}
            />
          </AppShell>
        );
      }
    }

    const bundle = await getUnifiedCourseDetail({
      url: resolvedDetailUrl,
      title,
      term
    });

    return (
      <AppShell title="Course Detail">
        <CourseDetailContent bundle={bundle} backHref={title ? buildCourseSearchHref(title, term) : "/courses"} />
      </AppShell>
    );
  } catch (error: unknown) {
    const message = error instanceof PortalApiError ? error.message : "Course detail could not load.";
    return (
      <AppShell title="Course Detail">
        <ErrorPanel title="Unavailable" message={message} />
      </AppShell>
    );
  }
}
