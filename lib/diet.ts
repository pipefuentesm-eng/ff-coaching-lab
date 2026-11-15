import { macrosOf, sumM, type Macros, ZERO } from './nutrition';
import { one, type Row } from './utils';

export type DietTree = { version: Row; meals: Row[]; goals: Macros };

/** Carga una versión completa: comidas → opciones → ítems (+ alimento) → equivalencias. Calcula totales. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadDiet(supabase: any, version: Row): Promise<DietTree> {
  const { data } = await supabase
    .from('diet_meals')
    .select('*, diet_options(*, diet_items(*, foods(*), diet_equivalences(*, foods(*))))')
    .eq('version_id', version.id)
    .order('position');
  const meals: Row[] = data ?? [];
  for (const m of meals) {
    m.diet_options.sort((a: Row, b: Row) => a.option_number - b.option_number);
    for (const o of m.diet_options) {
      o.diet_items.sort((a: Row, b: Row) => a.position - b.position);
      for (const it of o.diet_items) {
        it.food = one(it.foods);
        it.macros = macrosOf(it.food, Number(it.amount));
        for (const q of it.diet_equivalences ?? []) q.food = one(q.foods);
      }
      o.totals = sumM(o.diet_items.map((it: Row) => it.macros as Macros));
    }
    m.goal = (m.diet_options[0]?.totals as Macros | undefined) ?? ZERO;
  }
  const goals = sumM(meals.map((m) => m.goal as Macros));
  return { version, meals, goals };
}

/** Versión vigente más reciente para un tipo de día (con respaldo en 'base'). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function currentVersion(supabase: any, athleteId: string, dayType: string, today: string): Promise<Row | null> {
  for (const t of [dayType, 'base']) {
    const { data } = await supabase
      .from('diet_versions')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('day_type', t)
      .lte('valid_from', today)
      .order('valid_from', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);
    if (data?.[0]) return data[0];
  }
  return null;
}
