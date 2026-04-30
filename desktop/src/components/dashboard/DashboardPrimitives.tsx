import type React from "react";

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="muted empty-state">{children}</p>;
}

export function PanelHeader({
  title,
  meta
}: {
  title: string;
  meta?: string | number | null;
}) {
  return (
    <div className="section-heading">
      <h3>{title}</h3>
      {meta !== undefined && meta !== null ? <span>{meta}</span> : null}
    </div>
  );
}
