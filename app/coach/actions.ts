'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireCoach } from '@/lib/auth';
import { VIEW_AS_COOKIE } from '@/lib/auth';
import { bool, int, normalize, num, parseCsv, str, strOrNull, type Row } from '@/lib/utils';
import { check, done, exerciseFields, fail, moveRow } from './helpers';

/* ---------- Ver como atleta ---------- */
export async function enterViewAs(fd: FormData) {
  const { supabase, user } = await requireCoach();
  const athleteId = str(fd, 'athleteId');
  const { data } = await supabase.from('profiles').select('id').eq('id', athleteId).eq('coach_id', user.id).maybeSingle();
  if (!data) fail(fd, 'Ese alumno no es tuyo');
  (await cookies()).set(VIEW_AS_COOKIE, athleteId, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 4 });
  redirect('/athlete');
}

/* ---------- Ficha del alumno ---------- */
export async function updateAthleteProfile(fd: FormData) {
  const { supabase } = await requireCoach();
  const id = str(fd, 'athleteId');
  const cd = str(fd, 'checkin_day');
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: str(fd, 'full_name') || undefined,
      access_from: strOrNull(fd, 'access_from'),
      checkin_day: cd === '' ? null : Number(cd),
      water_goal_l: num(fd, 'water_goal_l'),
      active: bool(fd, 'active'),
    })
    .eq('id', id);
  check(fd, error);
  done(fd, 'Datos del alumno guardados');
}

/* ---------- Biblioteca de ejercicios ---------- */
export async function createExercise(fd: FormData) {
  const { supabase, user } = await requireCoach();
  const name = str(fd, 'name');
  const mg = str(fd, 'muscle_group');
  if (!name || !mg) fail(fd, 'Nombre y grupo muscular son obligatorios');
  const { error } = await supabase.from('exercises').insert({ coach_id: user.id, name, muscle_group: mg, video_url: strOrNull(fd, 'video_url') });
  check(fd, error);
  done(fd, 'Ejercicio creado');
}

export async function updateExercise(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase
    .from('exercises')
    .update({ name: str(fd, 'name'), muscle_group: str(fd, 'muscle_group'), video_url: strOrNull(fd, 'video_url') })
    .eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd, 'Ejercicio actualizado');
}

export async function deleteExercise(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('exercises').delete().eq('id', str(fd, 'id'));
  if (error) fail(fd, 'No se puede borrar: el ejercicio está en uso en algún programa o preset.');
  done(fd, 'Ejercicio eliminado');
}

/* ---------- Base de alimentos ---------- */
function foodFields(fd: FormData) {
  const unit = str(fd, 'unit') === 'u' ? 'u' : 'g';
  return {
    name: str(fd, 'name'),
    unit,
    kcal_per_unit: num(fd, 'kcal') ?? 0,
    protein_per_unit: num(fd, 'protein') ?? 0,
    carbs_per_unit: num(fd, 'carbs') ?? 0,
    fat_per_unit: num(fd, 'fat') ?? 0,
  };
}

export async function createFood(fd: FormData) {
  const { supabase, user } = await requireCoach();
  const f = foodFields(fd);
  if (!f.name) fail(fd, 'El nombre es obligatorio');
  const { error } = await supabase.from('foods').insert({ ...f, coach_id: user.id });
  check(fd, error);
  done(fd, 'Alimento creado');
}

export async function updateFood(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('foods').update(foodFields(fd)).eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd, 'Alimento actualizado');
}

export async function deleteFood(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('foods').delete().eq('id', str(fd, 'id'));
  check(fd, error, 'No se pudo borrar');
  done(fd, 'Alimento eliminado');
}

export async function importFoodsCsv(fd: FormData) {
  const { supabase, user } = await requireCoach();
  const rows = parseCsv(str(fd, 'csv'));
  if (rows.length === 0) fail(fd, 'Pega el contenido del CSV');
  const start = rows[0][0]?.toLowerCase() === 'name' ? 1 : 0;
  const { data: existing } = await supabase.from('foods').select('id,name').eq('coach_id', user.id);
  const byName = new Map<string, string>((existing ?? []).map((f: Row) => [normalize(f.name), f.id]));
  let created = 0;
  let updated = 0;
  const bad: number[] = [];
  for (let i = start; i < rows.length; i++) {
    const [name, unitRaw, kcal, p, c, g] = rows[i];
    const nums = [kcal, p, c, g].map((x) => Number(String(x ?? '').replace(',', '.')));
    if (!name || nums.some((n) => !Number.isFinite(n))) {
      bad.push(i + 1);
      continue;
    }
    const rec = {
      name,
      unit: unitRaw?.toLowerCase() === 'u' ? 'u' : 'g',
      kcal_per_unit: nums[0],
      protein_per_unit: nums[1],
      carbs_per_unit: nums[2],
      fat_per_unit: nums[3],
    };
    const id = byName.get(normalize(name));
    if (id) {
      await supabase.from('foods').update(rec).eq('id', id);
      updated++;
    } else {
      await supabase.from('foods').insert({ ...rec, coach_id: user.id });
      created++;
    }
  }
  done(fd, `Importación lista: ${created} nuevos, ${updated} actualizados${bad.length ? `, filas con error: ${bad.join(', ')}` : ''}`);
}

/* ---------- Presets ---------- */
export async function createPreset(fd: FormData) {
  const { supabase, user } = await requireCoach();
  const name = str(fd, 'name');
  if (!name) fail(fd, 'Ponle un nombre al preset');
  const { data, error } = await supabase
    .from('program_presets')
    .insert({ coach_id: user.id, name, description: strOrNull(fd, 'description') })
    .select('id')
    .single();
  check(fd, error);
  redirect(`/coach/presets/${data!.id}`);
}

export async function updatePreset(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase
    .from('program_presets')
    .update({ name: str(fd, 'name'), description: strOrNull(fd, 'description') })
    .eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd, 'Preset guardado');
}

export async function deletePreset(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('program_presets').delete().eq('id', str(fd, 'id'));
  check(fd, error);
  redirect('/coach/presets?ok=' + encodeURIComponent('Preset eliminado'));
}

export async function addPresetDay(fd: FormData) {
  const { supabase } = await requireCoach();
  const presetId = str(fd, 'presetId');
  const { count } = await supabase.from('preset_days').select('id', { count: 'exact', head: true }).eq('preset_id', presetId);
  const wd = str(fd, 'weekday');
  const { error } = await supabase
    .from('preset_days')
    .insert({ preset_id: presetId, name: str(fd, 'name') || 'Día', weekday: wd === '' ? null : Number(wd), position: count ?? 0 });
  check(fd, error);
  done(fd);
}

export async function updatePresetDay(fd: FormData) {
  const { supabase } = await requireCoach();
  const wd = str(fd, 'weekday');
  const { error } = await supabase
    .from('preset_days')
    .update({ name: str(fd, 'name'), weekday: wd === '' ? null : Number(wd) })
    .eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd, 'Día guardado');
}

export async function deletePresetDay(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('preset_days').delete().eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd);
}

export async function addPresetExercise(fd: FormData) {
  const { supabase } = await requireCoach();
  const dayId = str(fd, 'dayId');
  const exerciseId = str(fd, 'exercise_id');
  if (!exerciseId) fail(fd, 'Elige un ejercicio');
  const { count } = await supabase.from('preset_exercises').select('id', { count: 'exact', head: true }).eq('day_id', dayId);
  const { error } = await supabase
    .from('preset_exercises')
    .insert({ day_id: dayId, exercise_id: exerciseId, position: count ?? 0, ...exerciseFields(fd) });
  check(fd, error);
  done(fd);
}

export async function updatePresetExercise(fd: FormData) {
  const { supabase } = await requireCoach();
  const upd: Row = exerciseFields(fd);
  const exId = str(fd, 'exercise_id');
  if (exId) upd.exercise_id = exId;
  const { error } = await supabase.from('preset_exercises').update(upd).eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd, 'Ejercicio guardado');
}

export async function deletePresetExercise(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('preset_exercises').delete().eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd);
}

export async function movePresetExercise(fd: FormData) {
  const { supabase } = await requireCoach();
  await moveRow(supabase, 'preset_exercises', 'day_id', str(fd, 'parentId'), str(fd, 'id'), str(fd, 'dir') === 'up' ? -1 : 1);
  done(fd);
}

/* ---------- Campos de check-in (editor global) ---------- */
export async function createSection(fd: FormData) {
  const { supabase, user } = await requireCoach();
  const { count } = await supabase.from('checkin_sections').select('id', { count: 'exact', head: true }).eq('coach_id', user.id);
  const { error } = await supabase.from('checkin_sections').insert({ coach_id: user.id, name: str(fd, 'name') || 'Sección', position: count ?? 0 });
  check(fd, error);
  done(fd, 'Sección creada');
}

export async function renameSection(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase
    .from('checkin_sections')
    .update({ name: str(fd, 'name'), position: int(fd, 'position') ?? 0 })
    .eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd, 'Sección guardada');
}

export async function deleteSection(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('checkin_sections').delete().eq('id', str(fd, 'id'));
  if (error) fail(fd, 'No se puede borrar: algún campo de esta sección ya tiene respuestas. Apaga los campos en vez de borrarlos.');
  done(fd, 'Sección eliminada');
}

function fieldFields(fd: FormData) {
  const opts = str(fd, 'options')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    label: str(fd, 'label'),
    help: strOrNull(fd, 'help'),
    field_type: str(fd, 'field_type') || 'text',
    unit: strOrNull(fd, 'unit'),
    options: opts.length ? opts : null,
    weekly: bool(fd, 'weekly'),
    default_on: bool(fd, 'default_on'),
    position: int(fd, 'position') ?? 0,
  };
}

export async function createField(fd: FormData) {
  const { supabase } = await requireCoach();
  const f = fieldFields(fd);
  if (!f.label) fail(fd, 'La pregunta necesita una etiqueta');
  const { error } = await supabase.from('checkin_fields').insert({ ...f, section_id: str(fd, 'sectionId') });
  check(fd, error);
  done(fd, 'Pregunta creada');
}

export async function updateField(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('checkin_fields').update(fieldFields(fd)).eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd, 'Pregunta guardada');
}

export async function deleteField(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('checkin_fields').delete().eq('id', str(fd, 'id'));
  if (error) fail(fd, 'Esta pregunta ya tiene respuestas y no se puede borrar. Desmarca "Prendido en nuevos" o apágala por alumno.');
  done(fd, 'Pregunta eliminada');
}

/* ---------- Configuración de check-in por alumno ---------- */
export async function saveCheckinConfig(fd: FormData) {
  const { supabase } = await requireCoach();
  const athleteId = str(fd, 'athleteId');
  const ids = str(fd, 'fieldIds').split(',').filter(Boolean);
  const rows = ids.map((id) => ({ athlete_id: athleteId, field_id: id, enabled: bool(fd, 'on_' + id) }));
  const { error } = await supabase.from('athlete_checkin_fields').upsert(rows, { onConflict: 'athlete_id,field_id' });
  check(fd, error);
  done(fd, 'Configuración guardada');
}

export async function resetCheckinConfig(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('athlete_checkin_fields').delete().eq('athlete_id', str(fd, 'athleteId'));
  check(fd, error);
  done(fd, 'Configuración restablecida a los valores por defecto');
}

/* ---------- Revisión de check-in ---------- */
export async function markReviewed(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase
    .from('checkins')
    .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
    .eq('id', str(fd, 'checkinId'));
  check(fd, error);
  done(fd, 'Check-in marcado como revisado');
}

export async function addFeedback(fd: FormData) {
  const { supabase } = await requireCoach();
  const url = str(fd, 'loom_url');
  if (!url.startsWith('http')) fail(fd, 'Pega un link válido (https://…)');
  const { error } = await supabase.from('feedbacks').insert({
    athlete_id: str(fd, 'athleteId'),
    checkin_id: strOrNull(fd, 'checkinId'),
    loom_url: url,
    transcript: strOrNull(fd, 'transcript'),
  });
  check(fd, error);
  done(fd, 'Feedback enviado');
}

export async function deleteFeedback(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('feedbacks').delete().eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd);
}

/* ---------- Extras ---------- */
export async function saveEnergyGoals(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('energy_goals').upsert({
    athlete_id: str(fd, 'athleteId'),
    steps_goal: int(fd, 'steps_goal'),
    cardio_min_week: int(fd, 'cardio_min_week'),
    notes: strOrNull(fd, 'notes'),
    updated_at: new Date().toISOString(),
  });
  check(fd, error);
  done(fd, 'Metas de gasto guardadas');
}

function suppFields(fd: FormData) {
  return {
    name: str(fd, 'name'),
    dose: strOrNull(fd, 'dose'),
    timing: strOrNull(fd, 'timing'),
    kind: str(fd, 'kind') === 'suggested' ? 'suggested' : 'required',
    why: strOrNull(fd, 'why'),
    notes: strOrNull(fd, 'notes'),
  };
}

export async function addSupplement(fd: FormData) {
  const { supabase } = await requireCoach();
  const athleteId = str(fd, 'athleteId');
  const s = suppFields(fd);
  if (!s.name) fail(fd, 'El suplemento necesita un nombre');
  const { count } = await supabase.from('supplements').select('id', { count: 'exact', head: true }).eq('athlete_id', athleteId);
  const { error } = await supabase.from('supplements').insert({ ...s, athlete_id: athleteId, position: count ?? 0 });
  check(fd, error);
  done(fd, 'Suplemento agregado');
}

export async function updateSupplement(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('supplements').update(suppFields(fd)).eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd, 'Suplemento guardado');
}

export async function deleteSupplement(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('supplements').delete().eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd);
}

const BASIC_TEMPLATE = [
  { name: 'Creatina monohidratada', dose: '5 g', timing: 'Cualquier momento del día, todos los días', kind: 'required', why: 'Mejora el rendimiento en series de fuerza y la recuperación entre series.' },
  { name: 'Omega 3', dose: '2 cápsulas', timing: 'Con una comida', kind: 'required', why: 'Aporte de EPA/DHA, difícil de cubrir solo con la dieta.' },
  { name: 'Vitamina D3', dose: '2.000 UI', timing: 'Con una comida que tenga grasa', kind: 'required', why: 'Niveles bajos son comunes, sobre todo en invierno.' },
  { name: 'Complejo B', dose: '1 cápsula', timing: 'Desayuno', kind: 'required', why: 'Apoyo al metabolismo energético.' },
  { name: 'Magnesio bisglicinato', dose: 'Según etiqueta', timing: 'Noche', kind: 'required', why: 'Apoya la recuperación y el descanso.' },
  { name: 'Zinc', dose: '20 mg', timing: 'Noche, lejos del magnesio si molesta', kind: 'required', why: 'Mineral que suele faltar en dietas de déficit.' },
  { name: 'Cafeína', dose: 'Según tolerancia', timing: 'Pre-entreno · nunca después de las 18:00', kind: 'suggested', why: 'Más energía y foco al entrenar, sin afectar el sueño.' },
  { name: 'Melatonina', dose: 'Opcional', timing: '30 min antes de dormir', kind: 'suggested', why: 'Puede ayudar a conciliar el sueño en periodos puntuales.' },
];

export async function applyBasicTemplate(fd: FormData) {
  const { supabase } = await requireCoach();
  const athleteId = str(fd, 'athleteId');
  const { count } = await supabase.from('supplements').select('id', { count: 'exact', head: true }).eq('athlete_id', athleteId);
  if ((count ?? 0) > 0) fail(fd, 'La plantilla solo se aplica sobre una lista vacía');
  const { error } = await supabase.from('supplements').insert(BASIC_TEMPLATE.map((s, i) => ({ ...s, athlete_id: athleteId, position: i })));
  check(fd, error);
  done(fd, 'Plantilla Básica aplicada (revisa y ajusta los textos)');
}

export async function addAccessory(fd: FormData) {
  const { supabase } = await requireCoach();
  const athleteId = str(fd, 'athleteId');
  if (!str(fd, 'name')) fail(fd, 'El accesorio necesita un nombre');
  const { count } = await supabase.from('accessories').select('id', { count: 'exact', head: true }).eq('athlete_id', athleteId);
  const { error } = await supabase
    .from('accessories')
    .insert({ athlete_id: athleteId, name: str(fd, 'name'), note: strOrNull(fd, 'note'), position: count ?? 0 });
  check(fd, error);
  done(fd, 'Accesorio agregado');
}

export async function deleteAccessory(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('accessories').delete().eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd);
}

export async function loadStandardAccessories(fd: FormData) {
  const { supabase } = await requireCoach();
  const athleteId = str(fd, 'athleteId');
  const { data: existing } = await supabase.from('accessories').select('name').eq('athlete_id', athleteId);
  const have = new Set((existing ?? []).map((a: Row) => normalize(a.name)));
  const std = [
    { name: 'Cuffs para tobillo', note: 'Para patadas de glúteo y trabajo en polea' },
    { name: 'Lifting straps', note: 'Para tirones pesados cuando el agarre limita' },
    { name: 'Trípode para el celular', note: 'Para grabar la técnica y enviármela' },
  ].filter((a) => !have.has(normalize(a.name)));
  if (std.length) {
    const start = existing?.length ?? 0;
    const { error } = await supabase.from('accessories').insert(std.map((a, i) => ({ ...a, athlete_id: athleteId, position: start + i })));
    check(fd, error);
  }
  done(fd, 'Accesorios estándar cargados');
}
