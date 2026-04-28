import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPortalApiUrl } from "../lib/portal-api";
import type {
  TimmsItemDetail,
  TimmsSearchResponse,
  TimmsStreamVariant,
  TimmsTreeResponse
} from "../lib/product-types";
import { TimmsSearchBox } from "./timms-search-box";

function buildArchiveHref(options: {
  query?: string;
  itemId?: string;
  nodeId?: string;
  nodePath?: string;
}) {
  const params = new URLSearchParams();
  if (options.query?.trim()) {
    params.set("query", options.query.trim());
  }
  if (options.itemId?.trim()) {
    params.set("itemId", options.itemId.trim());
  }
  if (options.nodeId?.trim()) {
    params.set("nodeId", options.nodeId.trim());
  }
  if (options.nodePath?.trim()) {
    params.set("nodePath", options.nodePath.trim());
  }
  const query = params.toString();
  return query ? `/archive?${query}` : "/archive";
}

export function TimmsHub({
  search,
  tree,
  item,
  streams,
  currentQuery
}: {
  search: TimmsSearchResponse | null;
  tree: TimmsTreeResponse;
  item: TimmsItemDetail | null;
  streams: TimmsStreamVariant[];
  currentQuery: string;
}) {
  const selectedNode = tree.nodes.find((node) => node.node_id === tree.selected_node_id);

  return (
    <>
      <Card className="border-primary/15 bg-primary/5">
        <CardHeader>
          <div>
            <CardDescription>timms.uni-tuebingen.de</CardDescription>
            <CardTitle className="text-2xl">Study archive</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Search lecture recordings, jump into chapter markers, inspect item metadata, and extract direct MP4 variants.
            </p>
          </div>
          <CardAction>
            <Button variant="outline" size="xs" asChild>
              <a href={tree.source_url} target="_blank" rel="noreferrer">
                Open TIMMS
              </a>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <TimmsSearchBox
            action="/archive"
            defaultQuery={currentQuery}
            nodeId={tree.selected_node_id ?? undefined}
            nodePath={selectedNode?.node_path}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Search results</CardTitle>
              <CardAction>
                {search ? <Badge variant="secondary">{search.total_hits} matches</Badge> : null}
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              {search?.results.length ? (
                search.results.map((result) => (
                  <Link
                    key={result.item_id}
                    href={buildArchiveHref({
                      query: currentQuery,
                      itemId: result.item_id,
                      nodeId: tree.selected_node_id ?? undefined,
                      nodePath: selectedNode?.node_path
                    }) as Route}
                    scroll={false}
                    className="grid gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40 lg:grid-cols-[104px_minmax(0,1fr)]"
                  >
                    <div className="overflow-hidden rounded-2xl bg-muted">
                      {result.preview_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.preview_image_url}
                          alt={result.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-20 items-center justify-center text-xs text-muted-foreground">No preview</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{result.title}</p>
                        {result.duration_label ? <Badge variant="outline">{result.duration_label}</Badge> : null}
                      </div>
                      {result.chapters.length ? (
                        <div className="mt-3 space-y-1">
                          {result.chapters.slice(0, 4).map((chapter) => (
                            <div key={`${result.item_id}-${chapter.start_label}`} className="flex gap-2 text-xs text-muted-foreground">
                              <span className="shrink-0 font-medium text-foreground">{chapter.start_label}</span>
                              <span className="truncate">{chapter.title}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">
                  {currentQuery
                    ? "No TIMMS items matched this search."
                    : "Start with a lecture title, topic, or lecturer name to open the archive."}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Faculty tree</CardTitle>
              <CardDescription>Browse the public TIMMS content tree without leaving the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {tree.nodes.map((node) => (
                <Link
                  key={`${node.node_id}-${node.node_path}`}
                  href={buildArchiveHref({ query: currentQuery, nodeId: node.node_id, nodePath: node.node_path }) as Route}
                  scroll={false}
                  className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm transition-colors hover:bg-muted/40 ${node.is_open ? "bg-primary/5 text-primary" : "text-foreground"
                    }`}
                  style={{ marginLeft: `${node.depth * 14}px` }}
                >
                  <span className="truncate">{node.label}</span>
                  <span className="text-xs text-muted-foreground">{node.is_open ? "Open" : "Browse"}</span>
                </Link>
              ))}
              {tree.items.length ? (
                <div className="pt-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Visible media</p>
                  <div className="space-y-1">
                    {tree.items.map((treeItem) => (
                      <Link
                        key={treeItem.item_id}
                        href={buildArchiveHref({
                          query: currentQuery,
                          itemId: treeItem.item_id,
                          nodeId: tree.selected_node_id ?? undefined,
                          nodePath: selectedNode?.node_path
                        }) as Route}
                        scroll={false}
                        className="block rounded-2xl border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                      >
                        {treeItem.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{item ? item.title : "Select an item"}</CardTitle>
              <CardDescription>{item?.creator ?? "Choose a search result or tree item to inspect its metadata and stream variants."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {item ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {item.player_url ? (
                      <Button variant="outline" size="xs" asChild>
                        <a href={item.player_url} target="_blank" rel="noreferrer">
                          Open player
                        </a>
                      </Button>
                    ) : null}
                    {item.source_url ? (
                      <Button variant="outline" size="xs" asChild>
                        <a href={item.source_url} target="_blank" rel="noreferrer">
                          Open item page
                        </a>
                      </Button>
                    ) : null}
                    {Object.keys(item.citation_downloads).map((formatName) => (
                      <Button key={formatName} variant="outline" size="xs" asChild>
                        <a href={buildPortalApiUrl(`/api/timms/items/${item.item_id}/cite?format=${encodeURIComponent(formatName)}`)}>
                          {formatName}
                        </a>
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {item.metadata.map((field) => (
                      <div key={field.label} className="rounded-2xl border border-border px-3 py-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</p>
                        {field.url ? (
                          <a href={field.url} target="_blank" rel="noreferrer" className="mt-1 block text-sm font-medium text-primary">
                            {field.value}
                          </a>
                        ) : (
                          <p className="mt-1 text-sm">{field.value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">
                  Metadata, citations, and direct MP4 variants appear here after selecting an archive item.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stream variants</CardTitle>
              <CardDescription>Direct MP4 files extracted from the embedded player contract.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {streams.length ? (
                streams.map((stream) => (
                  <a
                    key={stream.url}
                    href={stream.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-border px-3 py-2 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap gap-2">
                      {stream.height ? <Badge variant="secondary">{stream.height}p</Badge> : null}
                      {stream.bitrate ? <Badge variant="outline">{stream.bitrate} kbps</Badge> : null}
                      {stream.provider ? <Badge variant="outline">{stream.provider}</Badge> : null}
                    </div>
                    <p className="mt-2 truncate text-sm text-muted-foreground">{stream.url}</p>
                  </a>
                ))
              ) : (
                <div className="rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">
                  Select a TIMMS item to list its extracted stream files.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
