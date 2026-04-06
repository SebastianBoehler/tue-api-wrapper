import { AppShell } from "../../components/app-shell";
import { ErrorPanel } from "../../components/error-panel";
import { TimmsHub } from "../../components/timms-hub";
import { PortalApiError } from "../../lib/portal-api";
import {
  getTimmsItem,
  getTimmsSearch,
  getTimmsStreams,
  getTimmsTree
} from "../../lib/product-api";

export default async function ArchivePage({
  searchParams
}: {
  searchParams?: Promise<{ query?: string; itemId?: string; nodeId?: string; nodePath?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.query?.trim() ?? "";
  const itemId = params.itemId?.trim() ?? "";
  const nodeId = params.nodeId?.trim() ?? "";
  const nodePath = params.nodePath?.trim() ?? "";

  try {
    const [tree, search, item, streams] = await Promise.all([
      getTimmsTree({ nodeId, nodePath }),
      query ? getTimmsSearch(query, 20) : Promise.resolve(null),
      itemId ? getTimmsItem(itemId) : Promise.resolve(null),
      itemId ? getTimmsStreams(itemId) : Promise.resolve([])
    ]);

    return (
      <AppShell title="Study Archive">
        <TimmsHub
          search={search}
          tree={tree}
          item={item}
          streams={streams}
          currentQuery={query}
        />
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof PortalApiError ? error.message : "The TIMMS archive could not load live data.";
    return (
      <AppShell title="Study Archive">
        <ErrorPanel title="Archive unavailable" message={message} />
      </AppShell>
    );
  }
}
