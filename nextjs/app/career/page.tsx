import { AppShell } from "../../components/app-shell";
import { CareerHub } from "../../components/career-hub";
import { ErrorPanel } from "../../components/error-panel";
import { PortalApiError } from "../../lib/portal-api";
import {
  getCareerFilters,
  getCareerProject,
  getCareerSearch
} from "../../lib/product-api";

function parseOptionalInt(value?: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function CareerPage({
  searchParams
}: {
  searchParams?: Promise<{ query?: string; projectTypeId?: string; industryId?: string; projectId?: string; page?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.query?.trim() ?? "";
  const projectTypeId = parseOptionalInt(params.projectTypeId);
  const industryId = parseOptionalInt(params.industryId);
  const projectId = parseOptionalInt(params.projectId);
  const currentPage = Math.max(parseOptionalInt(params.page) ?? 1, 1);

  try {
    const [filters, search, detail] = await Promise.all([
      getCareerFilters(),
      getCareerSearch({
        query,
        projectTypeIds: projectTypeId ? [projectTypeId] : [],
        industryIds: industryId ? [industryId] : [],
        page: currentPage - 1,
        perPage: 20
      }),
      projectId ? getCareerProject(projectId) : Promise.resolve(null)
    ]);

    return (
      <AppShell title="Career">
        <CareerHub
          search={search}
          filters={filters}
          detail={detail}
          query={query}
          selectedProjectTypeId={projectTypeId}
          selectedIndustryId={industryId}
          currentPage={currentPage}
        />
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "The Praxisportal product could not load live data.";
    return (
      <AppShell title="Career">
        <ErrorPanel title="Career unavailable" message={message} />
      </AppShell>
    );
  }
}
