import { r0, r1, type Row } from './utils';

export type Macros = { kcal: number; p: number; c: number; f: number };
export const ZERO: Macros = { kcal: 0, p: 0, c: 0, f: 0 };

/** 'g' = valores por 100 g ; 'u' = valores por unidad */
export function factor(food: Row, amount: number): number {
  return food.unit === 'g' ? amount / 100 : amount;
}

export function macrosOf(food: Row | null | undefined, amount: number): Macros {
  if (!food) return ZERO;
  const k = factor(food, Number(amount) || 0);
  return {
    kcal: Number(food.kcal_per_unit) * k,
    p: Number(food.protein_per_unit) * k,
    c: Number(food.carbs_per_unit) * k,
    f: Number(food.fat_per_unit) * k,
  };
}

export function sumM(list: Macros[]): Macros {
  return list.reduce((a, b) => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f }), { ...ZERO });
}

export function kcalFromPCG(p: number, c: number, f: number): number {
  return 4 * p + 4 * c + 9 * f;
}

export function fmtM(m: Macros): string {
  return `${r0(m.kcal)} kcal · P ${r1(m.p)} · C ${r1(m.c)} · G ${r1(m.f)}`;
}

export function unitLabel(food: Row | null | undefined): string {
  return food?.unit === 'u' ? 'u' : 'g';
}

/** Cantidad del alimento equivalente para igualar kcal (o carbohidratos) del ítem original. */
export function equivalentAmount(target: number, eqFood: Row, mode: 'kcal' | 'carbs', round5: boolean): number {
  const per = mode === 'kcal' ? Number(eqFood.kcal_per_unit) : Number(eqFood.carbs_per_unit);
  if (!per) return 0;
  const raw = eqFood.unit === 'g' ? (target / per) * 100 : target / per;
  if (eqFood.unit === 'g') return round5 ? Math.max(5, Math.round(raw / 5) * 5) : Math.max(1, Math.round(raw));
  return Math.max(0.5, Math.round(raw * 2) / 2);
}
