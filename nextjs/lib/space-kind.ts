/** Returns a Tailwind bg class for a given ILIAS space kind string. */
export function spaceKindColor(kind: string | null | undefined): string {
  if (!kind) return "bg-muted-foreground/30";
  const k = kind.toLowerCase();
  if (k.includes("kurs") || k.includes("course")) return "bg-primary";
  if (k.includes("gruppe") || k.includes("group")) return "bg-violet-500";
  if (k.includes("übung") || k.includes("exercise") || k.includes("seminar"))
    return "bg-amber-500";
  if (k.includes("wiki") || k.includes("material")) return "bg-sky-500";
  if (k.includes("projekt") || k.includes("project")) return "bg-emerald-500";
  return "bg-muted-foreground/40";
}
