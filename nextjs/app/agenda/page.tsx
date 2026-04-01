import { AppShell } from "../../components/app-shell";
import { AlmaTimetablePanel } from "../../components/alma-timetable-panel";
import { ErrorPanel } from "../../components/error-panel";
import { parseAgendaParams } from "../../lib/discovery-query";
import { getAlmaTimetableView, PortalApiError } from "../../lib/portal-api";

export default async function AgendaPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseAgendaParams(resolvedSearchParams);

  try {
    const view = await getAlmaTimetableView({
      term: filters.term,
      week: filters.week,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      singleDay: filters.singleDay,
      limit: 240
    });

    return (
      <AppShell title="Agenda">
        <AlmaTimetablePanel view={view} filters={filters} />
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "The agenda could not load.";
    return (
      <AppShell title="Agenda">
        <ErrorPanel title="Agenda unavailable" message={message} />
      </AppShell>
    );
  }
}
