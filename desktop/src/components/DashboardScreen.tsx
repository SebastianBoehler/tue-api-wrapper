import { useState } from "react";

import type { DesktopRuntimeState } from "../../shared/desktop-types";
import type { DashboardData } from "../lib/dashboard-types";
import { useCampusSnapshot } from "../lib/use-campus-snapshot";
import { useCourseDiscovery } from "../lib/use-course-discovery";
import { useMailSurface } from "../lib/use-mail-surface";
import { AssistantPage } from "./dashboard/AssistantPage";
import { CalendarPage } from "./dashboard/CalendarPage";
import { CampusPage } from "./dashboard/CampusPage";
import { CourseDiscoveryPage } from "./dashboard/CourseDiscoveryPage";
import { DashboardNav } from "./dashboard/DashboardNav";
import { LearningPage } from "./dashboard/LearningPage";
import { MailPage } from "./dashboard/MailPage";
import { StudyPage } from "./dashboard/StudyPage";
import { TodayPage } from "./dashboard/TodayPage";
import { ToolsPage } from "./dashboard/ToolsPage";
import type { DashboardPageId } from "./dashboard/types";

export function DashboardScreen({
  state,
  data,
  loading,
  error,
  onRefresh,
  onRestart,
  onClearCredentials
}: {
  state: DesktopRuntimeState;
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onRestart: () => Promise<void>;
  onClearCredentials: () => Promise<void>;
}) {
  const [activePage, setActivePage] = useState<DashboardPageId>("today");
  const campus = useCampusSnapshot(state.backendUrl ?? null, activePage === "campus");
  const discovery = useCourseDiscovery(state.backendUrl ?? null, activePage === "discovery");
  const mail = useMailSurface(state.backendUrl ?? null, activePage === "mail");

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Study hub desktop</p>
          <h1>{data?.hero.title ?? "Study Hub"}</h1>
          <p className="lead">{data?.hero.subtitle ?? "Your local desktop shell for the Tuebingen study tooling."}</p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={onRefresh} disabled={loading || !state.backendUrl} type="button">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      <DashboardNav activePage={activePage} data={data} onChange={setActivePage} />

      {error ? <div className="panel error-panel">{error}</div> : null}

      <main className="page-surface">
        {activePage === "today" ? <TodayPage data={data} state={state} /> : null}
        {activePage === "calendar" ? <CalendarPage data={data} state={state} /> : null}
        {activePage === "learning" ? <LearningPage data={data} state={state} /> : null}
        {activePage === "study" ? <StudyPage data={data} state={state} /> : null}
        {activePage === "mail" ? (
          <MailPage
            data={data}
            inbox={mail.inbox}
            mailbox={mail.mailbox}
            mailError={mail.error}
            mailLoading={mail.loading}
            mailboxes={mail.mailboxes}
            onRefreshMail={mail.refresh}
            query={mail.query}
            setMailbox={mail.setMailbox}
            setQuery={mail.setQuery}
            setUnreadOnly={mail.setUnreadOnly}
            state={state}
            unreadOnly={mail.unreadOnly}
          />
        ) : null}
        {activePage === "campus" ? (
          <CampusPage
            campus={campus.data}
            campusError={campus.error}
            campusLoading={campus.loading}
            data={data}
            onRefreshCampus={campus.refresh}
            state={state}
          />
        ) : null}
        {activePage === "discovery" ? (
          <CourseDiscoveryPage
            data={data}
            discovery={discovery}
            discoveryError={discovery.error}
            discoveryLoading={discovery.loading}
            onSearchDiscovery={discovery.search}
            setDiscoveryIncludePrivate={discovery.setIncludePrivate}
            setDiscoveryQuery={discovery.setQuery}
            setDiscoverySources={discovery.setSources}
            state={state}
          />
        ) : null}
        {activePage === "assistant" ? <AssistantPage data={data} state={state} /> : null}
        {activePage === "tools" ? (
          <ToolsPage
            data={data}
            loading={loading}
            onClearCredentials={onClearCredentials}
            onRefresh={onRefresh}
            onRestart={onRestart}
            state={state}
          />
        ) : null}
      </main>
    </div>
  );
}
