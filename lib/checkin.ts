import { fmtNum, type Row } from './utils';

/** ¿Está prendido este campo para el alumno? Sin fila de override vale default_on. */
export function fieldOn(field: Row, overrides: Map<string, boolean>): boolean {
  return overrides.has(field.id) ? !!overrides.get(field.id) : !!field.default_on;
}

export const FIELD_TYPES: { v: string; l: string }[] = [
  { v: 'number', l: 'Número' },
  { v: 'time_of_day', l: 'Hora del día' },
  { v: 'boolean_detail', l: 'Sí/No + detalle' },
  { v: 'enum', l: 'Opciones' },
  { v: 'enum_detail', l: 'Opciones + detalle' },
  { v: 'scale_1_5', l: 'Escala 1–5' },
  { v: 'scale_1_10', l: 'Escala 1–10' },
  { v: 'long_text', l: 'Texto largo' },
  { v: 'text', l: 'Texto corto' },
  { v: 'macros', l: 'Macros (P/C/G)' },
  { v: 'cardio', l: 'Cardio (tipo + min)' },
  { v: 'workout_select', l: 'Entrenamiento del día' },
  { v: 'time_duration', l: 'Duración (h + min)' },
  { v: 'nap_detail', l: 'Siesta (sí/no + min)' },
];

function n(fd: FormData, k: string): number | null {
  const v = String(fd.get(k) ?? '').trim().replace(',', '.');
  if (v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function s(fd: FormData, k: string): string {
  return String(fd.get(k) ?? '').trim();
}

/** Lee el valor de un campo desde el formulario. null = sin respuesta. */
export function parseFieldValue(field: Row, fd: FormData): unknown {
  const k = 'f_' + field.id;
  switch (field.field_type) {
    case 'number':
    case 'scale_1_5':
    case 'scale_1_10':
      return n(fd, k);
    case 'time_of_day':
    case 'enum':
    case 'text':
    case 'long_text':
    case 'workout_select':
      return s(fd, k) || null;
    case 'boolean_detail': {
      const yes = s(fd, k);
      if (!yes) return null;
      return { yes: yes === 'si', detail: s(fd, k + '__detail') };
    }
    case 'enum_detail': {
      const c = s(fd, k);
      if (!c) return null;
      return { choice: c, detail: s(fd, k + '__detail') };
    }
    case 'macros': {
      const p = n(fd, k + '__p'), c = n(fd, k + '__c'), g = n(fd, k + '__g');
      if (p === null && c === null && g === null) return null;
      return { p, c, g };
    }
    case 'cardio': {
      const min = n(fd, k + '__min');
      const type = s(fd, k + '__type');
      if (min === null && !type) return null;
      return { type, min };
    }
    case 'time_duration': {
      const h = n(fd, k + '__h'), m = n(fd, k + '__m');
      if (h === null && m === null) return null;
      return { h: h ?? 0, m: m ?? 0 };
    }
    case 'nap_detail': {
      const yes = s(fd, k);
      if (!yes) return null;
      return { yes: yes === 'si', min: n(fd, k + '__min') };
    }
    default:
      return s(fd, k) || null;
  }
}

/** Texto legible de una respuesta. */
export function formatValue(field: Row, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const o = v as Row;
  const unit = field.unit ? ` ${field.unit}` : '';
  switch (field.field_type) {
    case 'number':
      return fmtNum(Number(v)) + unit;
    case 'scale_1_5':
      return `${v}/5`;
    case 'scale_1_10':
      return `${v}/10`;
    case 'boolean_detail':
      return (o.yes ? 'Sí' : 'No') + (o.detail ? ` · ${o.detail}` : '');
    case 'enum_detail':
      return o.choice + (o.detail ? ` · ${o.detail}` : '');
    case 'macros':
      return `P ${o.p ?? '—'} · C ${o.c ?? '—'} · G ${o.g ?? '—'}`;
    case 'cardio':
      return `${o.type || 'Cardio'} ${o.min ?? '—'} min`;
    case 'time_duration':
      return `${o.h ?? 0} h ${o.m ?? 0} min`;
    case 'nap_detail':
      return o.yes ? `Sí · ${o.min ?? '?'} min` : 'No';
    default:
      return String(v);
  }
}

/** Número comparable (para mostrar cambios semana a semana). */
export function numericValue(field: Row, v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (['number', 'scale_1_5', 'scale_1_10'].includes(field.field_type)) return Number(v);
  if (field.field_type === 'time_duration') return Number((v as Row).h ?? 0) + Number((v as Row).m ?? 0) / 60;
  return null;
}
