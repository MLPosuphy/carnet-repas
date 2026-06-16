export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isExpiringSoon(date: Date | null) {
  if (!date) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threshold = addDays(today, 3);
  return date <= threshold;
}

export function getWeekRange(reference = new Date()) {
  const start = new Date(reference);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getWeekDays(start: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}
