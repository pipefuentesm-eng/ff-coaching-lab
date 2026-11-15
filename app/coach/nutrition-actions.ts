'use server';
import { requireCoach } from '@/lib/auth';
import { addDays, todayCL } from '@/lib/dates';
import { equivalentAmount, macrosOf } from '@/lib/nutrition';
import { matchFood, parseDietRows } from '@/lib/foodmatch';
import { num, parseCsv, r0, str, strOrNull, type Row } from '@/lib/utils';
import { check, done, fail, moveRow } from './helpers';

function dayType(fd: FormData): string {
  const t = str(fd, 'day_type');
  return t === 'descanso' || t === 'base' ? t : 'entreno';
}

export async function createDiet(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase
    .from('diet_versions')
    .insert({ athlete_id: str(fd, 'athleteId'), day_type: dayType(fd), valid_from: todayCL() });
  check(fd, error);
  done(fd, 'Dieta creada (vigente desde hoy)');
}

export async function newDietVersion(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.rpc('clone_diet_version', {
    p_version: str(fd, 'versionId'),
    p_day_type: dayType(fd),
    p_valid_from: addDays(todayCL(), 1),
  });
  check(fd, error);
  done(fd, 'Nueva versión creada: vigente desde mañana. Ya puedes editarla.');
}

export async function copyDietTo(fd: FormData) {
  const { supabase } = await requireCoach();
  const target = str(fd, 'target') === 'descanso' ? 'descanso' : 'entreno';
  const today = todayCL();
  const { count } = await supabase
    .from('diet_versions')
    .select('id', { count: 'exact', head: true })
    .eq('athlete_id', str(fd, 'athleteId'))
    .eq('day_type', target)
    .lte('valid_from', today);
  const from = (count ?? 0) > 0 ? addDays(today, 1) : today;
  const { error } = await supabase.rpc('clone_diet_version', { p_version: str(fd, 'versionId'), p_day_type: target, p_valid_from: from });
  check(fd, error);
  done(fd, `Dieta copiada a ${target === 'descanso' ? 'Descanso' : 'Entreno'} (vigente desde ${from === today ? 'hoy' : 'mañana'})`);
}

export async function deleteDietVersion(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('diet_versions').delete().eq('id', str(fd, 'versionId'));
  check(fd, error);
  done(fd, 'Versión descartada');
}

export async function savePlanNotes(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('diet_versions').update({ plan_notes: { text: str(fd, 'notes') } }).eq('id', str(fd, 'versionId'));
  check(fd, error);
  done(fd, 'Indicaciones guardadas');
}

export async function addMeal(fd: FormData) {
  const { supabase } = await requireCoach();
  const versionId = str(fd, 'versionId');
  const { count } = await supabase.from('diet_meals').select('id', { count: 'exact', head: true }).eq('version_id', versionId);
  const { data, error } = await supabase
    .from('diet_meals')
    .insert({ version_id: versionId, name: str(fd, 'name') || `Comida ${(count ?? 0) + 1}`, position: count ?? 0 })
    .select('id')
    .single();
  check(fd, error);
  await supabase.from('diet_options').insert({ meal_id: data!.id, option_number: 1 });
  done(fd);
}

export async function renameMeal(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('diet_meals').update({ name: str(fd, 'name') }).eq('id', str(fd, 'mealId'));
  check(fd, error);
  done(fd);
}

export async function deleteMeal(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('diet_meals').delete().eq('id', str(fd, 'mealId'));
  check(fd, error);
  done(fd);
}

export async function copyMeal(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.rpc('copy_diet_meal', { p_meal: str(fd, 'mealId'), p_target_version: str(fd, 'versionId') });
  check(fd, error);
  done(fd, 'Comida copiada');
}

export async function moveMeal(fd: FormData) {
  const { supabase } = await requireCoach();
  await moveRow(supabase, 'diet_meals', 'version_id', str(fd, 'versionId'), str(fd, 'mealId'), str(fd, 'dir') === 'up' ? -1 : 1);
  done(fd);
}

export async function addOption(fd: FormData) {
  const { supabase } = await requireCoach();
  const mealId = str(fd, 'mealId');
  const { data } = await supabase.from('diet_options').select('option_number').eq('meal_id', mealId).order('option_number', { ascending: false }).limit(1);
  const next = ((data?.[0]?.option_number as number | undefined) ?? 0) + 1;
  const { error } = await supabase.from('diet_options').insert({ meal_id: mealId, option_number: next });
  check(fd, error);
  done(fd);
}

export async function copyOption(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.rpc('copy_diet_option', { p_option: str(fd, 'optionId'), p_target_meal: str(fd, 'mealId') });
  check(fd, error);
  done(fd, 'Opción copiada');
}

export async function deleteOption(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('diet_options').delete().eq('id', str(fd, 'optionId'));
  check(fd, error);
  done(fd);
}

export async function addItem(fd: FormData) {
  const { supabase } = await requireCoach();
  const optionId = str(fd, 'optionId');
  const foodId = str(fd, 'food_id');
  const amount = num(fd, 'amount');
  if (!foodId || !amount) fail(fd, 'Elige un alimento y una cantidad');
  const { count } = await supabase.from('diet_items').select('id', { count: 'exact', head: true }).eq('option_id', optionId);
  const { error } = await supabase
    .from('diet_items')
    .insert({ option_id: optionId, food_id: foodId, amount, note: strOrNull(fd, 'note'), position: count ?? 0 });
  check(fd, error);
  done(fd);
}

export async function updateItem(fd: FormData) {
  const { supabase } = await requireCoach();
  const amount = num(fd, 'amount');
  if (!amount) fail(fd, 'La cantidad debe ser mayor a 0');
  const { error } = await supabase.from('diet_items').update({ amount, note: strOrNull(fd, 'note') }).eq('id', str(fd, 'itemId'));
  check(fd, error);
  done(fd);
}

export async function deleteItem(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('diet_items').delete().eq('id', str(fd, 'itemId'));
  check(fd, error);
  done(fd);
}

export async function addEquivalence(fd: FormData) {
  const { supabase } = await requireCoach();
  const itemId = str(fd, 'itemId');
  const foodId = str(fd, 'food_id');
  if (!foodId) fail(fd, 'Elige el alimento equivalente');
  const [{ data: item }, { data: eqFood }] = await Promise.all([
    supabase.from('diet_items').select('amount, foods(*)').eq('id', itemId).maybeSingle(),
    supabase.from('foods').select('*').eq('id', foodId).maybeSingle(),
  ]);
  const base = item?.foods ? (Array.isArray(item.foods) ? item.foods[0] : item.foods) : null;
  if (!item || !base || !eqFood) fail(fd, 'No se encontró el ítem o el alimento');
  const mode = str(fd, 'mode') === 'carbs' ? 'carbs' : 'kcal';
  const m = macrosOf(base as Row, Number(item!.amount));
  const target = mode === 'kcal' ? m.kcal : m.c;
  if (target <= 0) fail(fd, mode === 'carbs' ? 'El ítem original no tiene carbohidratos' : 'El ítem original no tiene calorías');
  const amount = num(fd, 'amount') ?? equivalentAmount(target, eqFood as Row, mode, str(fd, 'round5') === 'on');
  const kcal = r0(macrosOf(eqFood as Row, amount).kcal);
  const { error } = await supabase.from('diet_equivalences').insert({ item_id: itemId, food_id: foodId, amount, kcal });
  check(fd, error);
  done(fd);
}

export async function deleteEquivalence(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('diet_equivalences').delete().eq('id', str(fd, 'eqId'));
  check(fd, error);
  done(fd);
}

export async function importDietCsv(fd: FormData) {
  const { supabase, user } = await requireCoach();
  const versionId = str(fd, 'versionId');
  const rows = parseDietRows(parseCsv(str(fd, 'csv')));
  if (rows.length === 0) fail(fd, 'No hay filas válidas (Comida, Opción, Alimento, Cantidad)');
  const { data: foods } = await supabase.from('foods').select('*').eq('coach_id', user.id);
  const { data: meals } = await supabase.from('diet_meals').select('id,name,position, diet_options(id,option_number)').eq('version_id', versionId);
  const mealList: Row[] = meals ?? [];
  let pos = mealList.reduce((a, m) => Math.max(a, m.position + 1), 0);
  let added = 0;
  const skipped: number[] = [];

  for (const r of rows) {
    const food = matchFood(r.food, foods ?? []);
    if (!food || !r.amount) {
      skipped.push(r.line);
      continue;
    }
    let meal = mealList.find((m) => m.name.toLowerCase() === r.meal.toLowerCase());
    if (!meal) {
      const { data } = await supabase.from('diet_meals').insert({ version_id: versionId, name: r.meal, position: pos++ }).select('id,name,position').single();
      meal = { ...(data as Row), diet_options: [] };
      mealList.push(meal);
    }
    let opt = (meal.diet_options as Row[]).find((o) => o.option_number === r.option);
    if (!opt) {
      const { data } = await supabase.from('diet_options').insert({ meal_id: meal.id, option_number: r.option }).select('id,option_number').single();
      opt = data as Row;
      (meal.diet_options as Row[]).push(opt);
    }
    await supabase.from('diet_items').insert({ option_id: opt.id, food_id: food.id, amount: r.amount, position: added });
    added++;
  }
  done(fd, `CSV importado: ${added} ítems${skipped.length ? ` · filas sin coincidencia (no cargadas): ${skipped.join(', ')}` : ''}`);
}
