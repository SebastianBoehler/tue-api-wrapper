"use client";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import type { ModuleSearchFiltersResponse, ModuleSearchResponse, SearchOption } from "../lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink } from "lucide-react";

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

function buildSearchUrl(base: string, p: { query: string; degrees: string[]; subjects: string[]; elementTypes: string[]; languages: string[]; faculty: string; maxResults: number }) {
  const sp = new URLSearchParams();
  if (p.query.trim()) sp.set("query", p.query.trim());
  for (const v of p.degrees) sp.append("degree", v);
  for (const v of p.subjects) sp.append("subject", v);
  for (const v of p.elementTypes) sp.append("element_type", v);
  for (const v of p.languages) sp.append("language", v);
  if (p.faculty) sp.append("faculty", p.faculty);
  sp.set("max_results", String(p.maxResults));
  return `${base}/api/alma/module-search?${sp.toString()}`;
}

export function CourseDiscovery({ apiBaseUrl, filters, sourcePageUrl }: {
  apiBaseUrl: string;
  filters: ModuleSearchFiltersResponse["filters"];
  sourcePageUrl: string;
}) {
  const [query, setQuery] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [degrees, setDegrees] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [elementTypes, setElementTypes] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [faculty, setFaculty] = useState("");
  const [results, setResults] = useState<ModuleSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dq = useDeferredValue(query);

  const subjectOptions = filters.subjects.filter((o) => subjects.includes(o.value));
  const suggestions = filters.subjects.filter((o) => !subjects.includes(o.value) && subjectInput.trim() && o.label.toLowerCase().includes(subjectInput.trim().toLowerCase())).slice(0, 8);
  const hasFilters = dq.trim().length > 0 || degrees.length > 0 || subjects.length > 0 || elementTypes.length > 0 || languages.length > 0 || faculty.length > 0;

  useEffect(() => {
    if (!hasFilters) { setResults(null); setError(null); setLoading(false); return; }
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true); setError(null);
      try {
        const r = await fetch(buildSearchUrl(apiBaseUrl, { query: dq, degrees, subjects, elementTypes, languages, faculty, maxResults: 120 }), { signal: ctrl.signal });
        if (!r.ok) throw new Error((await r.text().catch(() => "")) || `Status ${r.status}`);
        setResults((await r.json()) as ModuleSearchResponse);
      } catch (e) { if (!ctrl.signal.aborted) { setResults(null); setError(e instanceof Error ? e.message : "Search failed."); } }
      finally { if (!ctrl.signal.aborted) setLoading(false); }
    }, 220);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [apiBaseUrl, dq, hasFilters, degrees, elementTypes, faculty, languages, subjects]);

  function reset() {
    startTransition(() => { setDegrees([]); setSubjects([]); setElementTypes([]); setLanguages([]); setFaculty(""); });
    setSubjectInput(""); setQuery("");
  }

  const Pill = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
    <button type="button" onClick={onClick} className={`inline-flex items-center h-7 px-2.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"}`}>{children}</button>
  );

  return (
    <div className="flex flex-col gap-3">
      <Card size="sm">
        <CardContent className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-primary" />
            <span className="text-sm font-medium">Alma catalog search</span>
          </div>
          <Button variant="outline" size="xs" asChild><a href={sourcePageUrl}><ExternalLink className="size-3" />Alma source</a></Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-3">
        {/* Filters */}
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardAction><Button variant="ghost" size="xs" onClick={reset}>Reset</Button></CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Search</label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Machine learning, ethics…" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Degree</label>
              <div className="flex flex-wrap gap-1.5">{filters.degrees.map((o) => <Pill key={o.value} active={degrees.includes(o.value)} onClick={() => startTransition(() => setDegrees((c) => toggle(c, o.value)))}>{o.label}</Pill>)}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subjects</label>
              <div className="relative">
                <Input value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} placeholder="Add Informatik, Biology…" />
                {suggestions.length ? (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 border border-border rounded-lg p-1 bg-card shadow-md">
                    {suggestions.map((o) => <button key={o.value} type="button" className="block w-full text-left text-sm px-2.5 py-1.5 rounded-md hover:bg-primary/10 hover:text-primary cursor-pointer" onClick={() => { startTransition(() => setSubjects((c) => c.includes(o.value) ? c : [...c, o.value])); setSubjectInput(""); }}>{o.label}</button>)}
                  </div>
                ) : null}
              </div>
              {subjectOptions.length ? <div className="flex flex-wrap gap-1.5">{subjectOptions.map((o) => <Pill key={o.value} active onClick={() => startTransition(() => setSubjects((c) => c.filter((v) => v !== o.value)))}>{o.label} ×</Pill>)}</div> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</label>
              <div className="flex flex-wrap gap-1.5">{filters.elementTypes.slice(0, 6).map((o) => <Pill key={o.value} active={elementTypes.includes(o.value)} onClick={() => startTransition(() => setElementTypes((c) => toggle(c, o.value)))}>{o.label}</Pill>)}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Language</label>
              <div className="flex flex-wrap gap-1.5">{filters.languages.map((o) => <Pill key={o.value} active={languages.includes(o.value)} onClick={() => startTransition(() => setLanguages((c) => toggle(c, o.value)))}>{o.label}</Pill>)}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Faculty</label>
              <select value={faculty} onChange={(e) => startTransition(() => setFaculty(e.target.value))} className="h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Any</option>
                {filters.faculties.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardAction className="flex gap-1.5">
              {(loading || isPending) && <Badge>Searching…</Badge>}
              {results && <Badge variant="secondary">{results.returnedResults}{typeof results.totalResults === "number" ? ` / ${results.totalResults}` : ""}</Badge>}
            </CardAction>
          </CardHeader>
          <CardContent>
            {error && <p className="text-sm text-destructive mb-3">{error}</p>}
            {results?.truncated && <p className="text-sm text-muted-foreground mb-3">Narrow filters to see all results.</p>}
            {results?.results.length ? (
              <div className="grid grid-cols-2 gap-2">
                {results.results.map((r) => (
                  <a key={`${r.detail_url ?? "r"}-${r.number ?? "n"}-${r.title}`} href={r.detail_url ? `/courses/detail?url=${encodeURIComponent(r.detail_url)}` : sourcePageUrl} className="border border-border rounded-lg p-3 hover:border-primary/40 hover:shadow-sm transition-all">
                    <Badge variant="secondary" className="mb-1.5">{r.element_type ?? "Item"}</Badge>
                    <p className="text-sm font-medium leading-snug">{r.title}</p>
                    <div className="flex items-end justify-between gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{r.number ?? "—"}</span>
                      <span>Details →</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : hasFilters && !loading ? (
              <div className="rounded-lg p-4 bg-muted text-sm text-muted-foreground"><p className="font-medium text-foreground">No matches.</p><p className="mt-1">Try broadening your search criteria.</p></div>
            ) : (
              <div className="rounded-lg p-4 bg-muted text-sm text-muted-foreground"><p className="font-medium text-foreground">Start searching.</p><p className="mt-1">Use filters or type a query to browse the catalog.</p></div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
