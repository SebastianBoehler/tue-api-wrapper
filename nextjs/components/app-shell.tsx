import type { ReactNode } from "react";
import { PortalNav } from "./portal-nav";
import { Separator } from "@/components/ui/separator";

export function AppShell({
  title,
  children
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[248px_minmax(0,1fr)] min-h-screen">
      <aside className="sticky top-0 h-screen flex flex-col gap-1 py-4 px-3 border-r border-sidebar-border bg-sidebar overflow-y-auto">
        <div className="px-3 pb-4">
          <p className="text-[0.65rem] font-semibold tracking-[0.1em] uppercase text-muted-foreground">Universität Tübingen</p>
          <h1 className="text-[0.95rem] font-semibold tracking-tight text-foreground mt-0.5">Study Hub</h1>
        </div>
        <Separator className="mb-2" />
        <PortalNav />
      </aside>
      <main className="flex flex-col gap-5 p-7 overflow-y-auto">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        </div>
        {children}
      </main>
    </div>
  );
}
