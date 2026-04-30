import { useEffect, useState, type CSSProperties } from "react";

import { fetchTimmsItem, fetchTimmsStreams, fetchTimmsTree, searchTimms } from "../../lib/api";
import type { TimmsItemDetail, TimmsSearchPage, TimmsSearchResult, TimmsStreamVariant, TimmsTreeItem, TimmsTreePage } from "../../lib/timms-types";
import { EmptyState, PanelHeader } from "./DashboardPrimitives";

export function TimmsArchivePanel({ baseUrl }: { baseUrl: string | null }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<TimmsSearchPage | null>(null);
  const [tree, setTree] = useState<TimmsTreePage | null>(null);
  const [detail, setDetail] = useState<TimmsItemDetail | null>(null);
  const [streams, setStreams] = useState<TimmsStreamVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!baseUrl) {
      return;
    }
    void loadTree({});
  }, [baseUrl]);

  async function loadTree(input: { nodeId?: string | null; nodePath?: string | null }) {
    if (!baseUrl) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTree(await fetchTimmsTree(baseUrl, input));
      setPage(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "TIMMS tree lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submitSearch() {
    if (!baseUrl || query.trim().length < 2) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const nextPage = await searchTimms(baseUrl, query.trim());
      setPage(nextPage);
      setDetail(null);
      setStreams([]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "TIMMS search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function selectItem(item: TimmsSearchResult) {
    await openItem(item.item_id);
  }

  async function selectTreeItem(item: TimmsTreeItem) {
    await openItem(item.item_id);
  }

  async function openItem(itemId: string) {
    if (!baseUrl) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextDetail, nextStreams] = await Promise.all([
        fetchTimmsItem(baseUrl, itemId),
        fetchTimmsStreams(baseUrl, itemId).catch(() => [])
      ]);
      setDetail(nextDetail);
      setStreams(nextStreams);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "TIMMS item lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="timms-layout">
      <article className="panel archive-tree-panel">
        <PanelHeader title="Archive tree" meta={`${tree?.items.length ?? 0} videos`} />
        <div className="tree-list">
          {(tree?.nodes ?? []).map((node) => (
            <button
              key={`${node.node_id}-${node.node_path}`}
              className={node.is_open ? "tree-node active" : "tree-node"}
              onClick={() => void loadTree({ nodeId: node.node_id, nodePath: node.node_path })}
              style={{ "--tree-depth": node.depth } as CSSProperties}
              type="button"
            >
              <span>{node.is_open ? "-" : "+"}</span>
              <strong>{node.label}</strong>
            </button>
          ))}
        </div>
        <div className="stack-list tree-items">
          {(tree?.items ?? []).map((item) => (
            <button key={item.item_id} className="link-row compact-row" onClick={() => void selectTreeItem(item)} type="button">
              <div>
                <strong>{item.title}</strong>
                <span>{item.item_id}</span>
              </div>
              <span>Open</span>
            </button>
          ))}
          {tree && tree.items.length === 0 ? <EmptyState>Select a module or lecture folder to show videos.</EmptyState> : null}
        </div>
      </article>

      <article className="panel discover-search-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TIMMS</p>
            <h3>Lecture archive</h3>
          </div>
          <button className="secondary-button compact-button" disabled={loading || query.trim().length < 2} onClick={submitSearch} type="button">
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        <input
          className="search-input"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void submitSearch()}
          placeholder="Search videos, lectures, speakers"
          value={query}
        />
        {error ? <p className="inline-error">{error}</p> : null}
        <div className="stack-list">
          {(page?.results ?? []).map((item) => (
            <button key={item.item_id} className="media-row" onClick={() => void selectItem(item)} type="button">
              {item.preview_image_url ? <img alt="" src={item.preview_image_url} /> : <div className="media-thumb" />}
              <div>
                <strong>{item.title}</strong>
                <span>{item.duration_label ?? item.item_id}</span>
                {item.chapters[0] ? <span>{item.chapters[0].title}</span> : null}
              </div>
            </button>
          ))}
          {page && page.results.length === 0 ? <EmptyState>No TIMMS videos matched the search.</EmptyState> : null}
        </div>
      </article>

      <article className="panel">
        <PanelHeader title="Archive detail" meta={detail?.creator ?? (page ? `${page.total_hits} hits` : "Select a video")} />
        {detail ? (
          <div className="detail-section-list">
            <div>
              <h4>{detail.title}</h4>
              {detail.creator ? <p className="muted">{detail.creator}</p> : null}
              <div className="button-row">
                {detail.player_url ? (
                  <button className="secondary-button" onClick={() => void window.desktop.openExternal(detail.player_url ?? "")} type="button">
                    Open player
                  </button>
                ) : null}
                {detail.source_url ? (
                  <button className="ghost-button" onClick={() => void window.desktop.openExternal(detail.source_url ?? "")} type="button">
                    Open TIMMS
                  </button>
                ) : null}
              </div>
            </div>
            {detail.metadata.slice(0, 8).map((field) => (
              <div key={`${field.label}-${field.value}`} className="detail-line">
                <span>{field.label}</span>
                <strong>{field.value}</strong>
              </div>
            ))}
            {streams.length > 0 ? (
              <div className="stream-list">
                <h4>Video files</h4>
                {streams.map((stream) => (
                  <button key={stream.url} className="link-row compact-row" onClick={() => void window.desktop.openExternal(stream.url)} type="button">
                    <div>
                      <strong>{streamLabel(stream)}</strong>
                      <span>{stream.provider ?? stream.streamer ?? "Direct stream"}</span>
                    </div>
                    <span>Open</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState>Browse the TIMMS tree or search the archive, then select a video for metadata and stream links.</EmptyState>
        )}
      </article>
    </section>
  );
}

function streamLabel(stream: TimmsStreamVariant): string {
  const resolution = stream.width && stream.height ? `${stream.width}×${stream.height}` : "Video";
  return stream.bitrate ? `${resolution} · ${stream.bitrate} kbit/s` : resolution;
}
