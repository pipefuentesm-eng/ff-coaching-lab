// Fechas siempre como texto 'AAAA-MM-DD' calculadas en la zona horaria del coach.
export const TZ = 'America/Santiago';

export function todayCL(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function dateCL(ts: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts));
}

export function addDays(d: string, n: number): string {
  const dt = new Date(d + 'T12:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** 0 = Domingo … 6 = Sábado */
export function weekdayOf(d: string): number {
  return new Date(d + 'T12:00:00Z').getUTCDay();
}

export function mondayOf(d: string): string {
  return addDays(d, -((weekdayOf(d) + 6) % 7));
}

/** Semana ISO como número AAAASS (ej. 202647). */
export function isoWeekKey(d: string): number {
  const dt = new Date(d + 'T12:00:00Z');
  const day = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - day + 3); // jueves de esa semana
  const year = dt.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4, 12));
  const week = 1 + Math.round(((dt.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return year * 100 + week;
}

/** Lunes de la semana ISO AAAASS. */
export function mondayOfWeekKey(key: number): string {
  const year = Math.floor(key / 100);
  const week = key % 100;
  const jan4 = `${year}-01-04`;
  return addDays(mondayOf(jan4), (week - 1) * 7);
}

export const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const WEEKDAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
/** Orden de la semana chilena: Lun..Dom */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, dd] = d.slice(0, 10).split('-').map(Number);
  return `${WEEKDAYS[weekdayOf(d.slice(0, 10))].toLowerCase()} ${dd} ${MONTHS[m - 1]}${y !== Number(todayCL().slice(0, 4)) ? ' ' + y : ''}`;
}

export function fmtDateTime(ts: string | null | undefined): string {
  if (!ts) return '—';
  const t = new Intl.DateTimeFormat('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  return `${fmtDate(dateCL(ts))} ${t}`;
}

export function minutesBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

/** Orden para listar días: Lun..Dom y al final los "sin día". */
export function weekdaySortKey(w: number | null | undefined): number {
  if (w === null || w === undefined) return 99;
  return (w + 6) % 7;
}
