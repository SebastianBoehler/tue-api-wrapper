const timetableDateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "short"
});

const timetableTimeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit"
});

export function formatTimetableDateLabel(value: string) {
  return timetableDateFormatter.format(new Date(value));
}

export function formatTimetableTimeLabel(value: string) {
  return timetableTimeFormatter.format(new Date(value));
}

export function getTimetableDateKey(value: string) {
  return value.slice(0, 10);
}
