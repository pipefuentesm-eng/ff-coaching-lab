import Link from 'next/link';
import { athleteContext } from '@/lib/auth';
import Flash from '@/components/Flash';
import { WEEKDAYS, WEEKDAYS_LONG, addDays, fmtDate, fmtDateTime, isoWeekKey, mondayOf, weekdayOf } from '@/lib/dates';
import type { Row } from '@/lib/utils';

export default async function CheckinHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, athleteId, athlete, today, canWrite } = await athleteContext();
  const week = isoWeekKey(today);
  const monday = mondayOf(today);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const { data: checkin } = await supabase.from('checkins').select('*').eq('athlete_id', athleteId).eq('week_number', week).maybeSingle();
  const { data: answers } = checkin
    ? await supabase.from('checkin_answers').select('entry_date').eq('checkin_id', checkin.id)
    : { data: [] as Row[] };
  const filled = new Set((answers ?? []).map((a: Row) => a.entry_date).filter(Boolean));
  const weeklyStarted = (answers ?? []).some((a: Row) => !a.entry_date);
  const { data: feedbacks } = await supabase.from('feedbacks').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }).limit(5);
  const statusText =
    checkin?.status === 'reviewed' ? '✓ Revisado por tu coach' : checkin?.status === 'submitted' ? 'Enviado · esperando revisión' : weeklyStarted ? 'Borrador guardado' : 'Pendiente';

  return (
    <>
      <Flash sp={sp} />
      <h1>Check-in</h1>

      <div className="card">
        <div className="card-head">
          <h2>Registro diario</h2>
          <span className="muted small">
            {filled.size}/7 días
          </span>
        </div>
        <div className="strip" style={{ marginTop: 0 }}>
          {dates.map((d) => {
            const isFilled = filled.has(d);
            const future = d > today;
            return (
              <Link
                key={d}
                href={future || !canWrite ? '#' : `/athlete/checkin/daily?date=${d}`}
                className={`d ${isFilled ? 'done' : d === today ? 'train' : ''}`}
                style={{ textDecoration: 'none', opacity: future ? 0.4 : 1 }}
              >
                <b>{WEEKDAYS[weekdayOf(d)]}</b>
                {Number(d.slice(8))}
                <div>{isFilled ? '✓' : ''}</div>
              </Link>
            );
          })}
        </div>
        {canWrite && (
          <Link className="btn btn-primary btn-block" href={`/athlete/checkin/daily?date=${today}`}>
            {filled.has(today) ? 'Editar registro de hoy' : 'Llenar registro de hoy'}
          </Link>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Check-in semanal</h2>
          <span className={`badge ${checkin?.status === 'reviewed' ? 'badge-ok' : checkin?.status === 'submitted' ? 'badge-accent' : ''}`}>{statusText}</span>
        </div>
        <p className="muted small">
          Semana del {fmtDate(monday)}
          {athlete.checkin_day !== null && athlete.checkin_day !== undefined ? ` · tu día de check-in es el ${WEEKDAYS_LONG[athlete.checkin_day].toLowerCase()}` : ''}
          {checkin?.submitted_at ? ` · enviado ${fmtDateTime(checkin.submitted_at)}` : ''}
        </p>
        <Link className="btn btn-block" href="/athlete/checkin/weekly">
          {checkin?.status === 'submitted' || checkin?.status === 'reviewed' ? 'Ver check-in semanal' : 'Llenar check-in semanal'}
        </Link>
      </div>

      {(feedbacks ?? []).length > 0 && (
        <div className="card">
          <h2>Feedback de tu coach</h2>
          <ul className="list">
            {(feedbacks ?? []).map((f: Row) => (
              <li key={f.id}>
                <a href={f.loom_url} target="_blank" rel="noreferrer" className="strong">
                  ▶ Video del {fmtDateTime(f.created_at)}
                </a>
                {f.transcript && <div className="muted small" style={{ whiteSpace: 'pre-wrap' }}>{f.transcript}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
