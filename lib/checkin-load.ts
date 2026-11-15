import { fieldOn } from './checkin';
import type { Row } from './utils';

/** Secciones con los campos que este alumno ve (diarios o semanales). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadAthleteFields(supabase: any, athleteId: string, coachId: string, weekly: boolean): Promise<Row[]> {
  const [{ data: secs }, { data: ov }] = await Promise.all([
    supabase.from('checkin_sections').select('*, checkin_fields(*)').eq('coach_id', coachId).order('position'),
    supabase.from('athlete_checkin_fields').select('*').eq('athlete_id', athleteId),
  ]);
  const overrides = new Map<string, boolean>((ov ?? []).map((o: Row) => [o.field_id, o.enabled]));
  return ((secs ?? []) as Row[])
    .map((s) => ({
      ...s,
      fields: (s.checkin_fields as Row[])
        .filter((f) => f.weekly === weekly && fieldOn(f, overrides))
        .sort((a, b) => a.position - b.position),
    }))
    .filter((s) => s.fields.length > 0);
}
