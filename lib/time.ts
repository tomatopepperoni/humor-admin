/** New York wall-clock helpers (the app's users are Columbia students). */

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  weekday: "short",
  hour12: false,
});

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function nyParts(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = partsFmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`, // YYYY-MM-DD in NY
    hour: Number(get("hour")) % 24,
    weekday: WEEKDAYS.indexOf(get("weekday")), // 0 = Monday
  };
}

export { WEEKDAYS };

/** The last `n` NY calendar days, oldest first, as YYYY-MM-DD. */
export function lastDaysNY(n: number, now = new Date()): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(nyParts(new Date(now.getTime() - i * 86_400_000)).day);
  }
  // DST edges can produce a duplicate; keep order, drop repeats.
  return [...new Set(days)];
}

const shortFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function fmtDateTime(iso: string) {
  return shortFmt.format(new Date(iso));
}

const dayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

/** "Oct 19" from a YYYY-MM-DD key. */
export function fmtDayKey(key: string) {
  return dayFmt.format(new Date(`${key}T12:00:00Z`));
}

export function hourLabel(h: number) {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
}
