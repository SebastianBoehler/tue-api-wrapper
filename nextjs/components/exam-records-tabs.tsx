"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExamItem } from "../lib/types";
import { EmptyState } from "./empty-state";

type Tab = "all" | "graded" | "pending";

function ExamBadges({ exam }: { exam: ExamItem }) {
  const status = (exam.status ?? "").trim().toUpperCase();
  const grade = (exam.grade ?? "").trim();
  const isFailed = grade === "5,0";
  const isPassed =
    ["BE", "PASSED", "BESTANDEN"].includes(status) ||
    (grade !== "" && grade !== "-" && !isFailed);

  const base =
    "inline-flex h-5 items-center rounded-lg border px-2 py-0.5 text-xs font-medium whitespace-nowrap";
  const passedCls =
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  const failedCls =
    "border-destructive/20 bg-destructive/10 text-destructive";
  const neutralStatusCls =
    "border-transparent bg-secondary text-secondary-foreground";
  const neutralGradeCls = "border-border text-foreground";

  const colorCls = isFailed ? failedCls : isPassed ? passedCls : undefined;

  return (
    <div className="flex gap-1.5 shrink-0">
      {exam.status ? (
        <span className={cn(base, colorCls ?? neutralStatusCls)}>
          {exam.status}
        </span>
      ) : null}
      {exam.grade ? (
        <span className={cn(base, colorCls ?? neutralGradeCls)}>
          {exam.grade}
        </span>
      ) : null}
    </div>
  );
}

export function ExamRecordsTabs({
  all,
  graded,
  pending,
}: {
  all: ExamItem[];
  graded: ExamItem[];
  pending: ExamItem[];
}) {
  const [tab, setTab] = useState<Tab>("all");
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: all.length },
    { id: "graded", label: "Graded", count: graded.length },
    { id: "pending", label: "Pending", count: pending.length },
  ];
  const items = tab === "all" ? all : tab === "graded" ? graded : pending;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex gap-0 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full tabular-nums",
                tab === t.id
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="pt-4">
        {items.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No records in this view"
            description="No exam rows match this filter."
          />
        ) : (
          <div className="divide-y divide-border">
            {items.map((exam) => (
              <div
                key={`${exam.number}-${exam.title}`}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{exam.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      exam.number,
                      exam.cp ? `${exam.cp} CP` : null,
                      exam.attempt ? `Attempt ${exam.attempt}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No structured metadata"}
                  </p>
                </div>
                <ExamBadges exam={exam} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
