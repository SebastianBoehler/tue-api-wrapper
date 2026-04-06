import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ListRows({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-border", className)}>{children}</div>
  );
}

export function ListRow({
  children,
  className,
  asChild,
  href,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const base = cn(
    "py-3 first:pt-0 last:pb-0",
    href || onClick
      ? "hover:bg-muted/50 -mx-1 px-1 rounded-sm transition-colors cursor-pointer"
      : "",
    className
  );

  if (href) {
    return (
      <a href={href} className={base}>
        {children}
      </a>
    );
  }

  return <div className={base}>{children}</div>;
}
