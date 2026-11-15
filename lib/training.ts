import { weekdaySortKey } from './dates';
import type { Row } from './utils';

export type Plan = {
  block: Row | null;
  weeks: Row[]; // cada semana con .days ordenados
  sessions: Map<string, Row>; // por day_id
  current: Row | null; // semana actual = primera con entrenamientos pendientes
};

export function dayDone(s: Row | undefined): boolean {
  return !!s && (s.status === 'completed' || s.status === 'skipped');
}

/** Bloque activo del alumno con semanas, días y sesiones. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadPlan(supabase: any, athleteId: string): Promise<Plan> {
  const { data: block } = await supabase
    .from('training_blocks')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .maybeSingle();
  if (!block) return { block: null, weeks: [], sessions: new Map(), current: null };

  const { data: weeks } = await supabase
    .from('training_weeks')
    .select('*, training_days(*, training_exercises(id, sets))')
    .eq('block_id', block.id)
    .order('week_number');
  const ws: Row[] = weeks ?? [];
  for (const w of ws) {
    w.days = (w.training_days as Row[]).sort((a, b) => weekdaySortKey(a.weekday) - weekdaySortKey(b.weekday) || a.position - b.position);
  }
  const dayIds = ws.flatMap((w) => (w.days as Row[]).map((d) => d.id));
  const sessions = new Map<string, Row>();
  if (dayIds.length) {
    const { data: ss } = await supabase
      .from('workout_sessions')
      .select('*, set_logs(id)')
      .eq('athlete_id', athleteId)
      .in('day_id', dayIds);
    for (const s of ss ?? []) sessions.set(s.day_id, s);
  }
  const current = ws.find((w) => (w.days as Row[]).some((d) => !dayDone(sessions.get(d.id)))) ?? ws[ws.length - 1] ?? null;
  return { block, weeks: ws, sessions, current };
}
