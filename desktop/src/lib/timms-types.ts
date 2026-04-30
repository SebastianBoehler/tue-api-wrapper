export interface TimmsChapter {
  start_seconds?: number | null;
  start_label: string;
  title: string;
  url: string;
}

export interface TimmsSearchResult {
  item_id: string;
  title: string;
  item_url: string;
  preview_image_url?: string | null;
  duration_label?: string | null;
  chapters: TimmsChapter[];
}

export interface TimmsSearchPage {
  query: string;
  total_hits: number;
  offset: number;
  limit: number;
  source_url: string;
  results: TimmsSearchResult[];
}

export interface TimmsMetadataField {
  label: string;
  value: string;
  url?: string | null;
}

export interface TimmsItemDetail {
  item_id: string;
  title: string;
  creator?: string | null;
  player_url?: string | null;
  citation_downloads: Record<string, string>;
  metadata: TimmsMetadataField[];
  source_url?: string | null;
}

export interface TimmsStreamVariant {
  url: string;
  width?: number | null;
  height?: number | null;
  bitrate?: number | null;
  provider?: string | null;
  streamer?: string | null;
}

export interface TimmsTreeNode {
  node_id: string;
  node_path: string;
  label: string;
  depth: number;
  is_open: boolean;
}

export interface TimmsTreeItem {
  item_id: string;
  title: string;
  url: string;
}

export interface TimmsTreePage {
  source_url: string;
  selected_node_id?: string | null;
  nodes: TimmsTreeNode[];
  items: TimmsTreeItem[];
}
