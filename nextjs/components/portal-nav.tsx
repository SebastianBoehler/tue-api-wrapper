"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, BookOpen, FolderOpen, FileText, MessageSquare, ClipboardList, GraduationCap } from "lucide-react";

const items = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/spaces", label: "Spaces", icon: FolderOpen },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/progress", label: "Progress", icon: GraduationCap },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/assistant", label: "Assistant", icon: MessageSquare }
] as const;

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Primary">
      {items.map((item) => {
        const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors duration-100 ${isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              }`}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
