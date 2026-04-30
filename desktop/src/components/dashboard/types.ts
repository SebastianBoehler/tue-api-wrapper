import type { DesktopRuntimeState } from "../../../shared/desktop-types";
import type { CampusSnapshot } from "../../lib/campus-types";
import type { DashboardData } from "../../lib/dashboard-types";
import type { MailboxSummary, MailInboxSummary } from "../../lib/mail-types";

export type DashboardPageId = "today" | "calendar" | "learning" | "study" | "mail" | "campus" | "assistant" | "tools";

export interface DashboardPageProps {
  state: DesktopRuntimeState;
  data: DashboardData | null;
}

export interface CampusPageProps extends DashboardPageProps {
  campus: CampusSnapshot | null;
  campusLoading: boolean;
  campusError: string | null;
  onRefreshCampus: () => void;
}

export interface MailPageProps extends DashboardPageProps {
  mailboxes: MailboxSummary[];
  inbox: MailInboxSummary | null;
  mailbox: string;
  query: string;
  unreadOnly: boolean;
  mailLoading: boolean;
  mailError: string | null;
  setMailbox: (mailbox: string) => void;
  setQuery: (query: string) => void;
  setUnreadOnly: (unreadOnly: boolean) => void;
  onRefreshMail: () => void;
}
