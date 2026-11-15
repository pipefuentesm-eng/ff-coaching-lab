import Link from 'next/link';
import { requireCoachOf } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { addFeedback, deleteFeedback, markReviewed } from '../../../actions';
import { fieldOn, formatValue, numericValue } from '@/lib/checkin';
import { WEEKDAYS, addDays, fmtDate, fmtDateTime, mondayOfWeekKey } from '@/lib/dates';
import { fmtNum, type Row } from '@/lib/utils';

const STATUS: Record<string, [string, string]> = {
  in_progress: ['En curso', 'badge'],
  submitted: ['Enviado · por revisar', 'badge badge-accent'],
  reviewed: ['Revisado', 'badge badge-ok'],
};

export default async function CheckinReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, athlete } = await requireCoachOf(id);
  const [{ data: checkins }, { data: secs }, { data: ov }, { data: feedbacks }] = await Promise.all([
    supabase.from('checkins').select('*').eq('athlete_id', id).order('week_number', { ascending: false }),
    supabase.from('checkin_sections').select('*, checkin_fields(*)').eq('coach_id', user.id).order('position'),
    supabase.from('athlete_checkin_fields').select('*').eq('athlete_id', id),
    supabase.from('feedbacks').select('*').eq('athlete_id', id).order('created_at', { ascending: false }),
  ]);
  const list: Row[] = checkins ?? [];
  const wanted = Number(sp.w);
  const idx = Math.max(0, list.findIndex((c) => c.week_number === wanted));
  const cur = list[idx];
  const prev = list[idx + 1];
  const overrides = new Map<string, boolean>((ov ?? []).map((o: Row) => [o.field_id, o.enabled]));
  const sections: Row[] = secs ?? [];
  sections.forEach((s) => s.checkin_fields.sort((a: Row, b: Row) => a.position - b.position));
  const back = `/coach/athletes/${id}/checkin${cur ? `?w=${cur.week_number}` : ''}`;

  let answers: Row[] = [];
  let prevAnswers: Row[] = [];
  if (cur) {
    const ids = [cur.id, prev?.id].filter(Boolean);
    const { data } = await supabase.from('checkin_answers').select('*').in('checkin_id', ids);
    answers = (data ?? []).filter((a: Row) => a.checkin_id === cur.id);
    prevAnswers = (data ?? []).filter((a: Row) => a.checkin_id === prev?.id);
  }
  const weeklyVal = (rows: Row[], fid: string) => rows.find((a) => a.field_id === fid && !a.entry_date)?.value;
  const dailyVal = (fid: string, date: string) => answers.find((a) => a.field_id === fid && a.entry_date === date)?.value;
  const monday = cur ? mondayOfWeekKey(cur.week_number) : '';
  const dates = cur ? Array.from({ length: 7 }, (_, i) => addDays(monday, i)) : [];
  const hasAnswer = (fid: string) => answers.some((a) => a.field_id === fid);

  return (
    <>
      <Flash sp={sp} />
      <Link href={`/coach/athletes/${id}`} className="muted small">
        ← {athlete.full_name}
      </Link>
      <h1 className="mt">Check-in · {athlete.full_name}</h1>

      {list.length === 0 ? (
        <div className="card">
          <p className="muted mb0">Este alumno aún no tiene check-ins.</p>
        </div>
      ) : (
        <>
          <div className="tabs">
            {list.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/coach/athletes/${id}/checkin?w=${c.week_number}`} className={`tab ${c.id === cur.id ? 'active' : ''}`}>
                Sem. {fmtDate(mondayOfWeekKey(c.week_number))}
                {c.status === 'submitted' ? ' •' : ''}
              </Link>
            ))}
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h2 className="mb0">
                  Semana del {fmtDate(monday)} al {fmtDate(addDays(monday, 6))}
                </h2>
                <span className={STATUS[cur.status][1]}>{STATUS[cur.status][0]}</span>{' '}
                {cur.submitted_at && <span className="muted small">enviado {fmtDateTime(cur.submitted_at)}</span>}
              </div>
              {cur.status !== 'reviewed' && (
                <form action={markReviewed}>
                  <input type="hidden" name="checkinId" value={cur.id} />
                  <input type="hidden" name="back" value={back} />
                  <SubmitButton>Marcar revisado</SubmitButton>
                </form>
              )}
            </div>

            <h3 className="mt">Respuestas semanales</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pregunta</th>
                    <th>Esta semana</th>
                    <th>Semana anterior</th>
                    <th>Cambio</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.flatMap((s) =>
                    (s.checkin_fields as Row[])
                      .filter((f) => f.weekly && (fieldOn(f, overrides) || hasAnswer(f.id)))
                      .map((f) => {
                        const a = weeklyVal(answers, f.id);
                        const b = weeklyVal(prevAnswers, f.id);
                        const na = numericValue(f, a);
                        const nb = numericValue(f, b);
                        const d = na !== null && nb !== null ? na - nb : null;
                        return (
                          <tr key={f.id}>
                            <td>{f.label}</td>
                            <td style={{ whiteSpace: 'pre-wrap' }}>{formatValue(f, a)}</td>
                            <td className="muted" style={{ whiteSpace: 'pre-wrap' }}>
                              {formatValue(f, b)}
                            </td>
                            <td>{d === null ? '' : `${d > 0 ? '+' : ''}${fmtNum(d)}`}</td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="mt">Registro diario</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pregunta</th>
                    {dates.map((d) => (
                      <th key={d} className="nowrap">
                        {WEEKDAYS[new Date(d + 'T12:00:00Z').getUTCDay()]} {Number(d.slice(8))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sections.flatMap((s) =>
                    (s.checkin_fields as Row[])
                      .filter((f) => !f.weekly && (fieldOn(f, overrides) || hasAnswer(f.id)))
                      .map((f) => (
                        <tr key={f.id}>
                          <td>{f.label}</td>
                          {dates.map((d) => (
                            <td key={d} className="small">
                              {formatValue(f, dailyVal(f.id, d))}
                            </td>
                          ))}
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2>Feedback en video (Loom)</h2>
        <form action={addFeedback} className="stack">
          <input type="hidden" name="athleteId" value={id} />
          <input type="hidden" name="checkinId" value={cur?.id ?? ''} />
          <input type="hidden" name="back" value={back} />
          <label className="field">
            Link del video
            <input name="loom_url" type="url" placeholder="https://www.loom.com/share/…" required />
          </label>
          <label className="field">
            Resumen escrito (opcional)
            <textarea name="transcript" rows={2} />
          </label>
          <div className="row end">
            <SubmitButton>Enviar feedback</SubmitButton>
          </div>
        </form>
        {(feedbacks ?? []).length > 0 && (
          <ul className="list mt">
            {(feedbacks ?? []).map((f: Row) => (
              <li key={f.id} className="row between">
                <a href={f.loom_url} target="_blank" rel="noreferrer">
                  ▶ {fmtDateTime(f.created_at)}
                </a>
                <form action={deleteFeedback}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="back" value={back} />
                  <SubmitButton className="btn btn-sm btn-ghost" confirm="¿Borrar este feedback?" pendingText="…">
                    ✕
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
