'use server';
import { redirect } from 'next/navigation';
import { requireCoach } from '@/lib/auth';
import { str, strOrNull, type Row } from '@/lib/utils';
import { check, done, exerciseFields, fail, moveRow } from './helpers';

export async function createBlock(fd: FormData) {
  const { supabase } = await requireCoach();
  const athleteId = str(fd, 'athleteId');
  const { error } = await supabase.rpc('create_block', {
    p_athlete: athleteId,
    p_name: str(fd, 'name') || 'Bloque',
    p_preset: strOrNull(fd, 'preset_id'),
    p_starts_on: strOrNull(fd, 'starts_on'),
  });
  check(fd, error, 'No se pudo crear el bloque');
  redirect(`/coach/athletes/${athleteId}?ok=` + encodeURIComponent('Bloque creado'));
}

export async function finishBlock(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('training_blocks').update({ status: 'finished' }).eq('id', str(fd, 'blockId'));
  check(fd, error);
  redirect(`/coach/athletes/${str(fd, 'athleteId')}?ok=` + encodeURIComponent('Bloque finalizado. Ya puedes crear uno nuevo.'));
}

export async function saveBlockAsPreset(fd: FormData) {
  const { supabase } = await requireCoach();
  const { data, error } = await supabase.rpc('save_block_as_preset', { p_block: str(fd, 'blockId'), p_name: str(fd, 'name') || 'Preset' });
  check(fd, error, 'No se pudo guardar el preset');
  redirect(`/coach/presets/${data}?ok=` + encodeURIComponent('Preset creado desde el bloque (última semana)'));
}

export async function duplicateWeek(fd: FormData) {
  const { supabase } = await requireCoach();
  const { data: newId, error } = await supabase.rpc('duplicate_week', { p_week: str(fd, 'weekId') });
  check(fd, error, 'No se pudo duplicar');
  const { data: w } = await supabase.from('training_weeks').select('week_number').eq('id', newId).maybeSingle();
  redirect(`/coach/athletes/${str(fd, 'athleteId')}?week=${w?.week_number ?? 1}&ok=` + encodeURIComponent('Semana duplicada: ajusta series, reps y RIR'));
}

export async function updateWeek(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('training_weeks').update({ starts_on: strOrNull(fd, 'starts_on') }).eq('id', str(fd, 'weekId'));
  check(fd, error);
  done(fd, 'Fecha de inicio guardada');
}

export async function deleteWeek(fd: FormData) {
  const { supabase } = await requireCoach();
  const { count } = await supabase
    .from('workout_sessions')
    .select('id, training_days!inner(week_id)', { count: 'exact', head: true })
    .eq('training_days.week_id', str(fd, 'weekId'));
  if ((count ?? 0) > 0) fail(fd, 'Esta semana ya tiene entrenamientos registrados por el alumno; no se puede borrar.');
  const { error } = await supabase.from('training_weeks').delete().eq('id', str(fd, 'weekId'));
  check(fd, error);
  redirect(`/coach/athletes/${str(fd, 'athleteId')}?ok=` + encodeURIComponent('Semana eliminada'));
}

export async function addDay(fd: FormData) {
  const { supabase } = await requireCoach();
  const weekId = str(fd, 'weekId');
  const { count } = await supabase.from('training_days').select('id', { count: 'exact', head: true }).eq('week_id', weekId);
  const wd = str(fd, 'weekday');
  const { error } = await supabase
    .from('training_days')
    .insert({ week_id: weekId, name: str(fd, 'name') || 'Día', weekday: wd === '' ? null : Number(wd), position: count ?? 0 });
  check(fd, error);
  done(fd, 'Día agregado');
}

export async function updateDay(fd: FormData) {
  const { supabase } = await requireCoach();
  const wd = str(fd, 'weekday');
  const { error } = await supabase
    .from('training_days')
    .update({ name: str(fd, 'name'), weekday: wd === '' ? null : Number(wd) })
    .eq('id', str(fd, 'dayId'));
  check(fd, error);
  done(fd, 'Día guardado');
}

export async function deleteDay(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('training_days').delete().eq('id', str(fd, 'dayId'));
  check(fd, error);
  done(fd, 'Día eliminado');
}

export async function copyPresetDay(fd: FormData) {
  const { supabase } = await requireCoach();
  const pday = str(fd, 'preset_day_id');
  if (!pday) fail(fd, 'Elige un día de preset');
  const { error } = await supabase.rpc('copy_preset_day_to_week', { p_pday: pday, p_week: str(fd, 'weekId') });
  check(fd, error, 'No se pudo copiar el día');
  done(fd, 'Día copiado (si ya existía uno con ese nombre, no se duplicó)');
}

export async function addTrainingExercise(fd: FormData) {
  const { supabase } = await requireCoach();
  const dayId = str(fd, 'dayId');
  const exerciseId = str(fd, 'exercise_id');
  if (!exerciseId) fail(fd, 'Elige un ejercicio de la biblioteca');
  const { count } = await supabase.from('training_exercises').select('id', { count: 'exact', head: true }).eq('day_id', dayId);
  const { error } = await supabase.from('training_exercises').insert({
    day_id: dayId,
    exercise_id: exerciseId,
    position: count ?? 0,
    ...exerciseFields(fd),
    week_note: strOrNull(fd, 'week_note'),
  });
  check(fd, error);
  done(fd);
}

export async function updateTrainingExercise(fd: FormData) {
  const { supabase } = await requireCoach();
  const upd: Row = { ...exerciseFields(fd), week_note: strOrNull(fd, 'week_note') };
  const exId = str(fd, 'exercise_id');
  if (exId) upd.exercise_id = exId;
  const { error } = await supabase.from('training_exercises').update(upd).eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd, 'Ejercicio guardado');
}

export async function deleteTrainingExercise(fd: FormData) {
  const { supabase } = await requireCoach();
  const { error } = await supabase.from('training_exercises').delete().eq('id', str(fd, 'id'));
  check(fd, error);
  done(fd);
}

export async function moveTrainingExercise(fd: FormData) {
  const { supabase } = await requireCoach();
  await moveRow(supabase, 'training_exercises', 'day_id', str(fd, 'parentId'), str(fd, 'id'), str(fd, 'dir') === 'up' ? -1 : 1);
  done(fd);
}
