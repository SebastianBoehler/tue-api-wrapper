import { AppShell } from "../../components/app-shell";
import { AlmaCourseCatalogCard } from "../../components/alma-course-catalog-card";
import { AlmaCourseSearchPanel } from "../../components/alma-course-search-panel";
import { CourseDiscovery } from "../../components/course-discovery";
import { ErrorPanel } from "../../components/error-panel";
import { StudyPlannerCard } from "../../components/study-planner-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  buildPortalApiUrl,
  getAlmaCourseCatalogPage,
  getAlmaCourseSearch,
  getAlmaStudyPlanner,
  getIliasMemberships,
  getModuleSearchFilters,
  PortalApiError
} from "../../lib/portal-api";
import { parseCourseDiscoveryParams } from "../../lib/discovery-query";

export default async function CoursesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const courseSearch = parseCourseDiscoveryParams(resolvedSearchParams);

  try {
    const [filtersResult, iliasResult, plannerResult, almaSearchResult, almaCatalogResult] = await Promise.allSettled([
      getModuleSearchFilters(),
      getIliasMemberships(8),
      getAlmaStudyPlanner(),
      getAlmaCourseSearch({ query: courseSearch.query, term: courseSearch.term, limit: 16 }),
      getAlmaCourseCatalogPage({ term: courseSearch.catalogTerm, limit: 80 })
    ]);
    if (filtersResult.status === "rejected") throw filtersResult.reason;
    const memberships = iliasResult.status === "fulfilled" ? iliasResult.value : [];
    const planner = plannerResult.status === "fulfilled" ? plannerResult.value : null;
    const almaSearch = almaSearchResult.status === "fulfilled" ? almaSearchResult.value : null;
    const almaCatalog = almaCatalogResult.status === "fulfilled" ? almaCatalogResult.value : null;

    return (
      <AppShell title="Courses">
        {planner ? <StudyPlannerCard planner={planner} /> : null}
        {almaSearch ? <AlmaCourseSearchPanel response={almaSearch} query={courseSearch.query} term={courseSearch.term} /> : null}
        {almaCatalog ? (
          <AlmaCourseCatalogCard
            catalog={almaCatalog}
            selectedTerm={courseSearch.catalogTerm || almaCatalog.selected_term_value || ""}
            courseQuery={courseSearch.query}
            courseTerm={courseSearch.term}
          />
        ) : null}
        <CourseDiscovery apiBaseUrl={buildPortalApiUrl("")} filters={filtersResult.value.filters} sourcePageUrl={filtersResult.value.sourcePageUrl} />
        {memberships.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Current learning spaces</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {memberships.map((space) => (
                  <a key={`${space.title}-${space.url}`} href={`/spaces?target=${encodeURIComponent(space.url)}`} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0 hover:bg-muted/50 -mx-1 px-1 rounded-sm transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{space.title}</span>
                        {space.kind ? <Badge variant="secondary">{space.kind}</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{space.description ?? space.properties[0] ?? "Open learning space"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">Open →</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "Course discovery could not load.";
    return (
      <AppShell title="Courses">
        <ErrorPanel title="Course discovery unavailable" message={message} />
      </AppShell>
    );
  }
}
