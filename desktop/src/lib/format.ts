export function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "Time pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time pending";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatDateRange(start: string, end?: string | null): string {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return "Time pending";
  }

  const formatter = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  if (!end) {
    return formatter.format(startDate);
  }

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) {
    return formatter.format(startDate);
  }

  return `${formatter.format(startDate)} - ${new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(endDate)}`;
}

export function formatCredits(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Unavailable";
  }

  return `${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, "")} CP`;
}
