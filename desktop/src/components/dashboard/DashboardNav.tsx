import type { DashboardData } from "../../lib/dashboard-types";
import type { DashboardPageId } from "./types";

interface DashboardNavItem {
  id: DashboardPageId;
  label: string;
  badge?: string | number;
}

export function DashboardNav({
  activePage,
  data,
  onChange
}: {
  activePage: DashboardPageId;
  data: DashboardData | null;
  onChange: (page: DashboardPageId) => void;
}) {
  const items: DashboardNavItem[] = [
    { id: "today", label: "Today" },
    { id: "calendar", label: "Calendar", badge: data?.agenda.items.length },
    { id: "learning", label: "Learning", badge: data?.ilias.tasks.length },
    { id: "study", label: "Study", badge: data?.study.passedExamCount },
    { id: "mail", label: "Mail", badge: data?.mail.unreadCount },
    { id: "campus", label: "Campus" },
    { id: "assistant", label: "Assistant" },
    { id: "tools", label: "Tools" }
  ];

  return (
    <nav className="desktop-nav" aria-label="Desktop sections">
      {items.map((item) => (
        <button
          key={item.id}
          className={item.id === activePage ? "nav-item active" : "nav-item"}
          onClick={() => onChange(item.id)}
          type="button"
        >
          <span>{item.label}</span>
          {item.badge !== undefined ? <small>{item.badge}</small> : null}
        </button>
      ))}
    </nav>
  );
}
