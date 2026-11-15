import Link from 'next/link';
import { athleteContext } from '@/lib/auth';
import Flash from '@/components/Flash';
import FieldInput from '@/components/FieldInput';
import SubmitButton from '@/components/SubmitButton';
import { loadAthleteFields } from '@/lib/checkin-load';
import { formatValue } from '@/lib/checkin';
import { fmtDate, isoWeekKey, mondayOf } from '@/lib/dates';
import type { Row } from '@/lib/utils';
import { saveWeekly } from '../../actions';

export default async function WeeklyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, athleteId, athlete, today, canWrite } = await athleteContext();
  const sections = await loadAthleteFields(supabase, athleteId, athlete.coach_id, true);
  const { data: checkin } = await supabase.from('checkins').select('*').eq('athlete_id', athleteId).eq('week_number', isoWeekKey(today)).maybeSingle();
  const { data: answers } = checkin
    ? await supabase.from('checkin_answers').select('*').eq('checkin_id', checkin.id).is('entry_date', null)
    : { data: [] as Row[] };
  const val = (fid: string) => (answers ?? []).find((a: Row) => a.field_id === fid)?.value;
  const editable = canWrite && checkin?.status !== 'reviewed';

  return (
    <>
      <Flash sp={sp} />
      <Link href="/athlete/checkin" className="muted small">
        ← Check-in
      </Link>
      <h1 className="mt">Check-in semanal</h1>
      <p className="muted small">Semana del {fmtDate(mondayOf(today))}</p>
      {checkin?.status === 'submitted' && <div className="alert alert-ok">Ya lo enviaste. Puedes corregirlo y volver a enviarlo hasta que tu coach lo revise.</div>}
      {checkin?.status === 'reviewed' && <div className="alert alert-ok">Tu coach ya revisó este check-in ✓</div>}
      {sections.length === 0 && <div className="card muted">Tu coach no tiene preguntas semanales activas para ti.</div>}
      {editable ? (
        <form action={saveWeekly}>
          {sections.map((s) => (
            <div className="card stack" key={s.id}>
              <div className="label">{s.name}</div>
              {(s.fields as Row[]).map((f) => (
                <FieldInput key={f.id} field={f} value={val(f.id)} />
              ))}
            </div>
          ))}
          {sections.length > 0 && (
            <div className="stack">
              <SubmitButton className="btn btn-primary btn-lg btn-block" name="intent" value="submit" pendingText="Enviando…">
                Enviar check-in
              </SubmitButton>
              <SubmitButton className="btn btn-block" name="intent" value="draft">
                Guardar borrador
              </SubmitButton>
            </div>
          )}
        </form>
      ) : (
        sections.map((s) => (
          <div className="card" key={s.id}>
            <div className="label">{s.name}</div>
            {(s.fields as Row[]).map((f) => (
              <div key={f.id} style={{ padding: '6px 0' }}>
                <div className="muted small">{f.label}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{formatValue(f, val(f.id))}</div>
              </div>
            ))}
          </div>
        ))
      )}
    </>
  );
}
