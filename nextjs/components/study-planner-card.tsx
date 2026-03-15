import Link from "next/link";
import type { AlmaStudyPlannerResponse } from "../lib/discovery-types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function StudyPlannerCard({ planner }: { planner: AlmaStudyPlannerResponse }) {
  const gridColumns = `repeat(${Math.max(planner.semesters.length, 1)}, minmax(180px, 1fr))`;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardDescription>Alma study planner</CardDescription>
          <CardTitle>Semester module plan</CardTitle>
        </div>
        <CardAction className="flex gap-2">
          {planner.view_state.show_recommended_plan ? <Badge variant="secondary">Musterplan</Badge> : null}
          {planner.view_state.show_my_modules ? <Badge variant="secondary">Meine Module</Badge> : null}
          {planner.view_state.show_alternative_semesters ? <Badge variant="outline">Alternative semester</Badge> : null}
          <Button variant="outline" size="xs" asChild>
            <a href={planner.page_url}>
              <ExternalLink className="size-3.5" />
              Alma
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="overflow-x-auto">
          <div className="grid gap-2 min-w-[760px]" style={{ gridTemplateColumns: gridColumns }}>
            {planner.semesters.map((semester) => (
              <div key={semester.index} className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{semester.label}</p>
                <p className="text-sm font-semibold mt-1">{semester.term_label ?? "Open term"}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-2 mt-2 min-w-[760px]" style={{ gridTemplateColumns: gridColumns }}>
            {planner.modules.map((module) => (
              <div
                key={`${module.row_index}-${module.column_start}-${module.title}`}
                className="rounded-xl border border-border bg-card p-3 shadow-sm"
                style={{
                  gridColumn: `${module.column_start} / span ${module.column_span}`,
                  gridRow: `${module.row_index}`
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {module.number ? <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{module.number}</p> : null}
                    <p className="text-sm font-medium leading-snug">{module.title}</p>
                  </div>
                  {module.credits_summary ? <Badge variant="outline">{module.credits_summary}</Badge> : null}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {module.is_expandable ? <Badge variant="secondary">Expandable</Badge> : null}
                  {module.detail_url ? (
                    <Button variant="ghost" size="xs" asChild>
                      <Link href={`/courses/detail?url=${encodeURIComponent(module.detail_url)}`}>Details</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
        {!planner.modules.length ? (
          <p className="text-sm text-muted-foreground">No planner modules were visible for the current study plan.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
