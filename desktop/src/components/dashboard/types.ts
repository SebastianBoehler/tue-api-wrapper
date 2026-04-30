import type { DesktopRuntimeState } from "../../../shared/desktop-types";
import type { CampusSnapshot } from "../../lib/campus-types";
import type { DashboardData } from "../../lib/dashboard-types";

export type DashboardPageId = "today" | "calendar" | "learning" | "study" | "mail" | "campus" | "tools";

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
