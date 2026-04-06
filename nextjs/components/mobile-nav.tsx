"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function MobileNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col gap-1 py-4 px-3 bg-sidebar border-r border-sidebar-border overflow-y-auto shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent/50 transition-colors"
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
            {children}
          </aside>
        </div>
      ) : null}
    </>
  );
}
