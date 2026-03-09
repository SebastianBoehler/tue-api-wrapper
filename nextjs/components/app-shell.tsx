import type { ReactNode } from "react";
import { PortalNav } from "./portal-nav";

export function AppShell({
  title,
  kicker,
  children
}: {
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Unified Alma + ILIAS</p>
          <h1>TUE Study Hub</h1>
          <p className="sidebar-copy">
            Reframe the university portal as one coherent workspace instead of a trail of legacy entry points.
          </p>
        </div>
        <PortalNav />
        <div className="sidebar-note">
          <span>{kicker}</span>
          <strong>{title}</strong>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
