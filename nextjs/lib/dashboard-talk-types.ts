export interface DashboardTalkTag {
  id: number;
  name: string;
}

export interface DashboardTalkItem {
  id: number;
  title: string;
  timestamp: string;
  description: string | null;
  location: string | null;
  speaker_name: string | null;
  speaker_bio: string | null;
  disabled: boolean;
  source_url: string;
  tags: DashboardTalkTag[];
}

export interface TalksPanel {
  available: boolean;
  sourceUrl: string;
  totalHits: number;
  items: DashboardTalkItem[];
  error: string | null;
}
