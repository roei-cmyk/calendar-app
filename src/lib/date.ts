import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { he } from "date-fns/locale";

// Hebrew/Israeli calendars start the week on Sunday.
const WEEK_OPTS = { weekStartsOn: 0 as const };

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatHebDate(date: Date, pattern = "d בMMMM yyyy"): string {
  return format(date, pattern, { locale: he });
}

export function dayLabel(date: Date): string {
  return format(date, "EEEE, d בMMMM", { locale: he });
}

export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date, WEEK_OPTS);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** All day-cells for a month grid, padded to full weeks. */
export function monthGridDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), WEEK_OPTS);
  const end = endOfWeek(endOfMonth(date), WEEK_OPTS);
  const days: Date[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function shiftDate(date: Date, view: "day" | "week" | "month" | "list", dir: 1 | -1): Date {
  if (view === "day") return addDays(date, dir);
  if (view === "week") return addDays(date, dir * 7);
  return addMonths(date, dir);
}

export const HEB_WEEKDAY_SHORT = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
