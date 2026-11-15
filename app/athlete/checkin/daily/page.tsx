import Link from 'next/link';
import { athleteContext } from '@/lib/auth';
import Flash from '@/components/Flash';
import FieldInput from '@/components/FieldInput';
import SubmitButton from '@/components/SubmitButton';
import { loadAthleteFields } from '@/lib/checkin-load';
import { formatValue } from '@/lib/checkin';
import { loadPlan } from '@/lib/training';
import { fmtDate, isoWeekKey } from '@/lib/dates';
import type { Row } from '@/lib/utils';
import { saveDaily } from '../../actions';

export default async function DailyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, athleteId, athlete, today, canWrite } = await athleteContext();
  let date = typeof sp.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  if (date > today) date = today;

  const sections = await loadAthleteFields(supabase, athleteId, athlete.coach_id, false);
  const { data: checkin } = await supabase.from('checkins').select('id').eq('athlete_id', athleteId).eq('week_number', isoWeekKey(date)).maybeSingle();
  const { data: answers } = checkin
    ? await supabase.from('checkin_answers').select('*').eq('checkin_id', checkin.id).eq('entry_date', date)
    : { data: [] as Row[] };
  const val = (fid: string) => (answers ?? []).find((a: Row) => a.field_id === fid)?.value;
  const plan = await loadPlan(supabase, athleteId);
  const workouts = [...new Set(((plan.current?.days ?? []) as Row[]).map((d) => d.name as string))];

  return (
    <>
      <Flash sp={sp} />
      <Link href="/athlete/checkin" className="muted small">
        ← Check-in
      </Link>
      <h1 className="mt">Registro diario · {fmtDate(date)}</h1>
      {sections.length === 0 && <div className="card muted">Tu coach no tiene preguntas diarias activas para ti.</div>}
      {canWrite ? (
        <form action={saveDaily}>
          <input type="hidden" name="date" value={date} />
          {sections.map((s) => (
            <div className="card stack" key={s.id}>
              <div className="label">{s.name}</div>
              {(s.fields as Row[]).map((f) => (
                <FieldInput key={f.id} field={f} value={val(f.id)} workouts={workouts} />
              ))}
            </div>
          ))}
          {sections.length > 0 && (
            <SubmitButton className="btn btn-primary btn-lg btn-block">Guardar registro</SubmitButton>
          )}
        </form>
      ) : (
        sections.map((s) => (
          <div className="card" key={s.id}>
            <div className="label">{s.name}</div>
            {(s.fields as Row[]).map((f) => (
              <div className="item-line" key={f.id}>
                <span>{f.label}</span>
                <strong>{formatValue(f, val(f.id))}</strong>
              </div>
            ))}
          </div>
        ))
      )}
    </>
  );
}
