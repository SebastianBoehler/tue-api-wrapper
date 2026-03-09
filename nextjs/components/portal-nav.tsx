"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Overview" },
  { href: "/agenda", label: "Agenda" },
  { href: "/courses", label: "Courses" },
  { href: "/spaces", label: "Spaces" },
  { href: "/documents", label: "Documents" },
  { href: "/assistant", label: "Assistant" }
] as const;

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="portal-nav" aria-label="Primary">
      {items.map((item) => {
        const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? "portal-link active" : "portal-link"}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
