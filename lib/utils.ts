/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

/** Los joins anidados de Supabase pueden venir como objeto o arreglo: normaliza a objeto. */
export function one<T = Row>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

export function strOrNull(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === '' ? null : v;
}

/** Número desde un formulario (acepta coma decimal). null si está vacío o no es número. */
export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key).replace(',', '.');
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function int(fd: FormData, key: string): number | null {
  const n = num(fd, key);
  return n === null ? null : Math.round(n);
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === 'on' || v === 'true' || v === '1';
}

export function r0(n: number): number {
  return Math.round(n);
}
export function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return String(r1(Number(n))).replace('.', ',');
}

export function enc(msg: string): string {
  return encodeURIComponent(msg);
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** CSV simple (separador , o ;) con soporte de comillas. */
export function parseCsv(text: string): string[][] {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  return lines.map((line) => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (ch === sep && !q) {
        out.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    out.push(cur.trim());
    return out;
  });
}
