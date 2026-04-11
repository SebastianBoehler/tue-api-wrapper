import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UnifiedCourseDetail } from "../lib/course-detail-types";
import type { AlmaDetailTable } from "../lib/types";

export function CourseDetailContent({
  bundle,
  backHref
}: {
  bundle: UnifiedCourseDetail;
  backHref: string;
}) {
  const detail = bundle.alma;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardDescription>{detail.number ?? "Alma course detail"}</CardDescription>
          <CardTitle className="text-lg">{detail.title}</CardTitle>
        </div>
        <CardAction className="flex gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={backHref as Route}>
              <ArrowLeft className="size-3.5" />
              Back
            </Link>
          </Button>
          {detail.permalink ? (
            <Button variant="outline" size="sm" asChild>
              <a href={detail.permalink}>
                <ExternalLink className="size-3.5" />
                Alma
              </a>
            </Button>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <RegistrationHints bundle={bundle} />
        <AlmaSections bundle={bundle} />
        <RelatedIlias bundle={bundle} />
        <LookupSummary bundle={bundle} />
      </CardContent>
    </Card>
  );
}

function RegistrationHints({ bundle }: { bundle: UnifiedCourseDetail }) {
  if (!bundle.registration_hints.length) {
    return null;
  }

  return (
    <section className="rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">Registration</p>
      <div className="mt-2 grid gap-2">
        {bundle.registration_hints.map((hint) => (
          <div key={`${hint.label}-${hint.text}`}>
            <p className="text-xs text-muted-foreground">{hint.label}</p>
            <p className="text-sm font-medium leading-snug">{hint.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AlmaSections({ bundle }: { bundle: UnifiedCourseDetail }) {
  const detail = bundle.alma;

  return (
    <section className="grid gap-4">
      {detail.available_tabs.length ? (
        <div className="flex flex-wrap gap-1.5">
          {detail.available_tabs.map((tab) => (
            <Badge key={tab} variant={tab === detail.active_tab ? "default" : "outline"}>
              {tab}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {detail.sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{section.title}</p>
            <div className="flex flex-col gap-2">
              {section.fields.map((field) => (
                <div key={`${section.title}-${field.label}`}>
                  <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </span>
                  <p className="text-sm font-medium leading-snug">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {detail.module_study_program_tables.length ? (
        <div className="grid gap-3">
          {detail.module_study_program_tables.map((table, index) => (
            <DetailTable key={`${table.title}-${index}`} table={table} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DetailTable({ table }: { table: AlmaDetailTable }) {
  const columnIndexes = Array.from(
    { length: Math.max(1, table.headers.length, ...table.rows.map((row) => row.length)) },
    (_, index) => index
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="border-b border-border bg-muted/30 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{table.title}</p>
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {columnIndexes.map((index) => (
              <th key={`${table.title}-header-${index}`} className="px-3 py-2 font-medium text-muted-foreground">
                {table.headers[index] ?? `Spalte ${index + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`${table.title}-row-${rowIndex}`} className="border-b border-border last:border-0">
              {columnIndexes.map((cellIndex) => (
                <td key={`${table.title}-row-${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top">
                  {row[cellIndex] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelatedIlias({ bundle }: { bundle: UnifiedCourseDetail }) {
  return (
    <section className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ILIAS</p>
          <h2 className="text-sm font-semibold">Related learning spaces</h2>
        </div>
        {bundle.ilias_results.length ? <Badge variant="secondary">{bundle.ilias_results.length} matches</Badge> : null}
      </div>

      {bundle.ilias_error ? <p className="mt-2 text-sm text-destructive">{bundle.ilias_error}</p> : null}

      {bundle.ilias_results.length ? (
        <div className="mt-3 grid gap-2">
          {bundle.ilias_results.map((item) => (
            <div key={`${item.result.info_url ?? item.result.url ?? item.result.title}`} className="rounded-lg bg-muted/30 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.result.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[item.result.item_type, item.result.breadcrumbs.join(" / "), item.match_reason]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {item.result.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.result.description}</p>
                  ) : null}
                </div>
                <IliasAction result={item.result} />
              </div>
            </div>
          ))}
        </div>
      ) : bundle.ilias_error ? null : (
        <p className="mt-3 text-sm text-muted-foreground">No matching ILIAS learning space was found.</p>
      )}
    </section>
  );
}

function IliasAction({ result }: { result: UnifiedCourseDetail["ilias_results"][number]["result"] }) {
  if (result.url) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href={`/spaces?target=${encodeURIComponent(result.url)}` as Route}>Open</Link>
      </Button>
    );
  }

  return result.info_url ? (
    <Button variant="outline" size="sm" asChild>
      <a href={result.info_url}>Info</a>
    </Button>
  ) : null;
}

function LookupSummary({ bundle }: { bundle: UnifiedCourseDetail }) {
  if (!bundle.lookup_queries.length) {
    return null;
  }

  return (
    <section className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
      {bundle.lookup_queries.map((query) => (
        <span key={`${query.portal}-${query.query}-${query.reason}`} className="rounded-md border border-border px-2 py-1">
          {query.portal}: {query.query} ({query.result_count})
        </span>
      ))}
    </section>
  );
}
