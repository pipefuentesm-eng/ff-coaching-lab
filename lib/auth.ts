import { cache } from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { todayCL } from './dates';
import type { Row } from './utils';

export const VIEW_AS_COOKIE = 'view_as';

/** Usuario + perfil. Redirige a /login si no hay sesión. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile) redirect('/login?error=' + encodeURIComponent('Tu perfil no existe. Contacta a tu coach.'));
  return { supabase, user, profile: profile as Row };
});

export async function requireCoach() {
  const s = await getSession();
  if (s.profile.role !== 'coach') redirect('/athlete');
  return s;
}

/** Coach + alumno (verifica que el alumno sea suyo). */
export async function requireCoachOf(athleteId: string) {
  const s = await requireCoach();
  const { data: athlete } = await s.supabase
    .from('profiles')
    .select('*')
    .eq('id', athleteId)
    .eq('coach_id', s.user.id)
    .maybeSingle();
  if (!athlete) notFound();
  return { ...s, athlete: athlete as Row };
}

/** Devuelve a qué alumno mirar: el de la cookie "ver como" (si es del coach) o el propio usuario. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveAthlete(supabase: any, userId: string): Promise<{ athleteId: string; viewing: boolean }> {
  const c = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (c) {
    const { data } = await supabase.from('profiles').select('id').eq('id', c).eq('coach_id', userId).maybeSingle();
    if (data) return { athleteId: c, viewing: true };
  }
  return { athleteId: userId, viewing: false };
}

/** Contexto de toda página del atleta. Usar SIEMPRE athleteId (nunca user.id) en las consultas. */
export const athleteContext = cache(async () => {
  const s = await getSession();
  const { athleteId, viewing } = await resolveAthlete(s.supabase, s.user.id);
  if (!viewing && s.profile.role === 'coach') redirect('/coach/athletes');
  let athlete: Row = s.profile;
  if (viewing) {
    const { data } = await s.supabase.from('profiles').select('*').eq('id', athleteId).maybeSingle();
    athlete = (data as Row) ?? s.profile;
  }
  const today = todayCL();
  const locked = !!athlete.access_from && today < athlete.access_from;
  return { ...s, athleteId, viewing, athlete, today, locked, canWrite: !viewing && !locked };
});

export async function viewingAsActive(): Promise<boolean> {
  return !!(await cookies()).get(VIEW_AS_COOKIE)?.value;
}

/** Guardia para TODA server action del atleta: nunca escribir mirando "como atleta" ni antes de la fecha de inicio. */
export async function athleteWriteGuard() {
  if (await viewingAsActive()) redirect('/athlete');
  const ctx = await athleteContext();
  if (ctx.locked || ctx.viewing) redirect('/athlete');
  return ctx;
}
