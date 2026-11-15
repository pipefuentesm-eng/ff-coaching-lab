import { normalize, type Row } from './utils';

/** Busca el alimento por nombre: exacto (sin tildes ni mayúsculas) y si no, el que contenga el texto. */
export function matchFood(name: string, foods: Row[]): Row | null {
  const n = normalize(name);
  if (!n) return null;
  const exact = foods.find((f) => normalize(f.name) === n);
  if (exact) return exact;
  const starts = foods.find((f) => normalize(f.name).startsWith(n));
  if (starts) return starts;
  return foods.find((f) => normalize(f.name).includes(n) || n.includes(normalize(f.name))) ?? null;
}

export type DietCsvRow = { line: number; meal: string; option: number; food: string; amount: number | null };

/** Columnas: Comida, Opción, Alimento, Cantidad */
export function parseDietRows(rows: string[][]): DietCsvRow[] {
  const out: DietCsvRow[] = [];
  rows.forEach((r, i) => {
    const [meal, opt, food, amount] = r;
    if (i === 0 && normalize(meal ?? '') === 'comida') return;
    if (!meal || !food) return;
    const a = Number(String(amount ?? '').replace(',', '.'));
    out.push({ line: i + 1, meal: meal.trim(), option: Math.max(1, parseInt(opt ?? '1', 10) || 1), food: food.trim(), amount: Number.isFinite(a) && a > 0 ? a : null });
  });
  return out;
}
