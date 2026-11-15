'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { athleteWriteGuard, VIEW_AS_COOKIE } from '@/lib/auth';
import { fieldOn, parseFieldValue } from '@/lib/checkin';
import { isoWeekKey, todayCL } from '@/lib/dates';
import { enc, int, num, str, strOrNull, type Row } from '@/lib/utils';

function back(fd: FormData, fallback = '/athlete'): string {
  const b = str(fd, 'back');
  return b.startsWith('/athlete') ? b : fallback;
}

/* ---------- Ver como atleta: salir ---------- */
export async function exitViewAs(fd: FormData) {
  (await cookies()).delete(VIEW_AS_COOKIE);
  const id = str(fd, 'athleteId');
  redirect(id ? `/coach/athletes/${id}` : '/coach/athletes');
}

/* ---------- Entrenamiento ---------- */
export async function startSession(fd: FormData) {
  const { supabase, athleteId } = await athleteWriteGuard();
  const dayId = str(fd, 'dayId');
  const survey = {
    sleep_h: str(fd, 'sleep_h'),
    sleep_q: str(fd, 'sleep_q'),
    energy: str(fd, 'energy'),
    stress: str(fd, 'stress'),
    pain: str(fd, 'pain'),
    note: str(fd, 'note'),
  };
  const { data: existing } = await supabase.from('workout_sessions').select('id').eq('athlete_id', athleteId).eq('day_id', dayId).maybeSingle();
  if (!existing) {
    const { error } = await supabase.from('workout_sessions').insert({ athlete_id: athleteId, day_id: dayId, survey });
    if (error && !String(error.message).includes('duplicate')) redirect(`/athlete/workout/${dayId}/pre?error=` + enc('No se pudo iniciar: ' + error.message));
  }
  redirect(`/athlete/workout/${dayId}`);
}

export async function skipDay(fd: FormData) {
  const { supabase, athleteId } = await athleteWriteGuard();
  const dayId = str(fd, 'dayId');
  const now = new Date().toISOString();
  const { data: existing } = await supabase.from('workout_sessions').select('id').eq('athlete_id', athleteId).eq('day_id', dayId).maybeSingle();
  if (existing) await supabase.from('workout_sessions').update({ status: 'skipped', finished_at: now }).eq('id', existing.id);
  else await supabase.from('workout_sessions').insert({ athlete_id: athleteId, day_id: dayId, status: 'skipped', finished_at: now, note: strOrNull(fd, 'note') });
  redirect('/athlete');
}

export async function saveSet(fd: FormData) {
  const { supabase } = await athleteWriteGuard();
  const dayId = str(fd, 'dayId');
  const teId = str(fd, 'teId');
  const { error } = await supabase.from('set_logs').upsert(
    {
      session_id: str(fd, 'sessionId'),
      training_exercise_id: teId,
      set_number: int(fd, 'set_number') ?? 1,
      weight_kg: num(fd, 'weight_kg'),
      reps: int(fd, 'reps'),
      rir: num(fd, 'rir'),
    },
    { onConflict: 'session_id,training_exercise_id,set_number' }
  );
  if (error) redirect(`/athlete/workout/${dayId}?error=` + enc('No se pudo guardar la serie'));
  redirect(`/athlete/workout/${dayId}#ex-${teId}`);
}

export async function finishSession(fd: FormData) {
  const { supabase } = await athleteWriteGuard();
  const status = str(fd, 'intent') === 'skip' ? 'skipped' : 'completed';
  await supabase
    .from('workout_sessions')
    .update({ status, finished_at: new Date().toISOString(), note: strOrNull(fd, 'note') })
    .eq('id', str(fd, 'sessionId'));
  redirect('/athlete?ok=' + enc(status === 'completed' ? '¡Entrenamiento completado! 💪' : 'Entrenamiento saltado'));
}

export async function cancelSession(fd: FormData) {
  const { supabase } = await athleteWriteGuard();
  await supabase.from('workout_sessions').delete().eq('id', str(fd, 'sessionId')).eq('status', 'in_progress');
  redirect('/athlete');
}

/* ---------- Nutrición: modo macros ---------- */
export async function addMacroLog(fd: FormData) {
  const { supabase, athleteId } = await athleteWriteGuard();
  const foodId = strOrNull(fd, 'food_id');
  const amount = num(fd, 'amount');
  const p = num(fd, 'protein'), c = num(fd, 'carbs'), g = num(fd, 'fat');
  const b = back(fd, '/athlete/nutrition');
  if (!(foodId && amount) && p === null && c === null && g === null) redirect(b + (b.includes('?') ? '&' : '?') + 'error=' + enc('Anota macros o elige un alimento con cantidad'));
  const { error } = await supabase.from('macro_logs').insert({
    athlete_id: athleteId,
    meal_id: strOrNull(fd, 'mealId'),
    log_date: todayCL(),
    food_id: foodId && amount ? foodId : null,
    amount: foodId && amount ? amount : null,
    label: strOrNull(fd, 'label'),
    protein: foodId && amount ? null : p,
    carbs: foodId && amount ? null : c,
    fat: foodId && amount ? null : g,
  });
  if (error) redirect(b + (b.includes('?') ? '&' : '?') + 'error=' + enc('No se pudo guardar'));
  redirect(b);
}

export async function deleteMacroLog(fd: FormData) {
  const { supabase } = await athleteWriteGuard();
  await supabase.from('macro_logs').delete().eq('id', str(fd, 'id'));
  redirect(back(fd, '/athlete/nutrition'));
}

/* ---------- Check-ins ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureCheckin(supabase: any, athleteId: string, week: number): Promise<Row> {
  const { data } = await supabase.from('checkins').select('*').eq('athlete_id', athleteId).eq('week_number', week).maybeSingle();
  if (data) return data;
  const { data: created, error } = await supabase.from('checkins').insert({ athlete_id: athleteId, week_number: week }).select('*').single();
  if (error) {
    const { data: again } = await supabase.from('checkins').select('*').eq('athlete_id', athleteId).eq('week_number', week).single();
    return again;
  }
  return created;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveAnswers(supabase: any, athleteId: string, checkinId: string, weekly: boolean, entryDate: string | null, fd: FormData) {
  const { data: profile } = await supabase.from('profiles').select('coach_id').eq('id', athleteId).single();
  const [{ data: secs }, { data: ov }] = await Promise.all([
    supabase.from('checkin_sections').select('checkin_fields(*)').eq('coach_id', profile.coach_id),
    supabase.from('athlete_checkin_fields').select('*').eq('athlete_id', athleteId),
  ]);
  const overrides = new Map<string, boolean>((ov ?? []).map((o: Row) => [o.field_id, o.enabled]));
  const fields: Row[] = (secs ?? []).flatMap((s: Row) => s.checkin_fields).filter((f: Row) => f.weekly === weekly && fieldOn(f, overrides));
  const upserts: Row[] = [];
  const toDelete: string[] = [];
  for (const f of fields) {
    const v = parseFieldValue(f, fd);
    if (v === null) toDelete.push(f.id);
    else upserts.push({ checkin_id: checkinId, field_id: f.id, entry_date: entryDate, value: v });
  }
  if (upserts.length) {
    const { error } = await supabase.from('checkin_answers').upsert(upserts, { onConflict: 'checkin_id,field_id,entry_date' });
    if (error) throw new Error('No se pudieron guardar las respuestas: ' + error.message);
  }
  if (toDelete.length) {
    let q = supabase.from('checkin_answers').delete().eq('checkin_id', checkinId).in('field_id', toDelete);
    q = entryDate ? q.eq('entry_date', entryDate) : q.is('entry_date', null);
    await q;
  }
}

export async function saveDaily(fd: FormData) {
  const { supabase, athleteId, today } = await athleteWriteGuard();
  let date = str(fd, 'date') || today;
  if (date > today) date = today;
  const checkin = await ensureCheckin(supabase, athleteId, isoWeekKey(date));
  await saveAnswers(supabase, athleteId, checkin.id, false, date, fd);
  redirect('/athlete/checkin?ok=' + enc('Registro diario guardado ✓'));
}

export async function saveWeekly(fd: FormData) {
  const { supabase, athleteId, today } = await athleteWriteGuard();
  const checkin = await ensureCheckin(supabase, athleteId, isoWeekKey(today));
  await saveAnswers(supabase, athleteId, checkin.id, true, null, fd);
  if (str(fd, 'intent') === 'submit' && checkin.status !== 'reviewed') {
    await supabase.from('checkins').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', checkin.id);
    redirect('/athlete/checkin?ok=' + enc('¡Check-in enviado a tu coach! ✓'));
  }
  redirect('/athlete/checkin/weekly?ok=' + enc('Borrador guardado'));
}

/* ---------- Extras ---------- */
export async function saveEnergyLog(fd: FormData) {
  const { supabase, athleteId, today } = await athleteWriteGuard();
  const { error } = await supabase
    .from('energy_logs')
    .upsert({ athlete_id: athleteId, log_date: today, steps: int(fd, 'steps'), cardio_min: int(fd, 'cardio_min') }, { onConflict: 'athlete_id,log_date' });
  redirect('/athlete/gasto?' + (error ? 'error=' + enc('No se pudo guardar') : 'ok=' + enc('Guardado ✓')));
}

export async function toggleAccessory(fd: FormData) {
  const { supabase, athleteId } = await athleteWriteGuard();
  const accessoryId = str(fd, 'accessoryId');
  if (str(fd, 'has') === '1') await supabase.from('accessory_checks').delete().eq('athlete_id', athleteId).eq('accessory_id', accessoryId);
  else await supabase.from('accessory_checks').insert({ athlete_id: athleteId, accessory_id: accessoryId });
  redirect('/athlete/accesorios');
}
