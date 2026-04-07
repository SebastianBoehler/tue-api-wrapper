export interface SearchItem {
  id: string;
  title: string;
  url: string;
  text: string;
  metadata?: Record<string, string>;
}
