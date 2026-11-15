import Link from 'next/link';
import { notFound } from 'next/navigation';
import { athleteContext } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { prescriptionText } from '@/components/ExerciseEditor';
import { cancelSession, finishSession, saveSet } from '../../actions';
import { fmtDate, dateCL, fmtDateTime } from '@/lib/dates';
import { one, type Row } from '@/lib/utils';

export default async function LoggerPage({
  params,
  searchParams,
}: {
  params: Promise<{ dayId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { dayId } = await params;
  const sp = await searchParams;
  const { supabase, athleteId, canWrite } = await athleteContext();

  const { data: day } = await supabase
    .from('training_days')
    .select('*, training_exercises(*, exercises(name, muscle_group, video_url))')
    .eq('id', dayId)
    .maybeSingle();
  if (!day) notFound();
  const exs: Row[] = (day.training_exercises ?? []).sort((a: Row, b: Row) => a.position - b.position);

  const { data: session } = await supabase.from('workout_sessions').select('*').eq('athlete_id', athleteId).eq('day_id', dayId).maybeSingle();
  const { data: logs } = session ? await supabase.from('set_logs').select('*').eq('session_id', session.id) : { data: [] as Row[] };
  const logOf = (teId: string, n: number) => (logs ?? []).find((l: Row) => l.training_exercise_id === teId && l.set_number === n);

  // Rendimiento anterior: últimas series de cada ejercicio en otra sesión
  const exerciseIds = [...new Set(exs.map((e) => e.exercise_id))];
  const prevByExercise = new Map<string, { date: string; sets: Row[] }>();
  if (exerciseIds.length) {
    const { data: other } = await supabase
      .from('workout_sessions')
      .select('id, started_at, set_logs(*, training_exercises(exercise_id))')
      .eq('athlete_id', athleteId)
      .neq('day_id', dayId)
      .order('started_at', { ascending: false })
      .limit(40);
    for (const s of other ?? []) {
      const grouped = new Map<string, Row[]>();
      for (const l of (s.set_logs ?? []) as Row[]) {
        const exId = one(l.training_exercises)?.exercise_id as string;
        if (!exerciseIds.includes(exId) || prevByExercise.has(exId)) continue;
        if (!grouped.has(exId)) grouped.set(exId, []);
        grouped.get(exId)!.push(l);
      }
      for (const [exId, sets] of grouped) {
        if (!prevByExercise.has(exId)) prevByExercise.set(exId, { date: dateCL(s.started_at), sets: sets.sort((a, b) => a.set_number - b.set_number) });
      }
    }
  }

  const active = !!session && session.status === 'in_progress' && canWrite;
  const editable = !!session && canWrite && session.status !== 'skipped';

  return (
    <>
      <Flash sp={sp} />
      <Link href="/athlete" className="muted small">
        ← Volver
      </Link>
      <div className="card-head mt">
        <h1 className="mb0">{day.name}</h1>
        {session && (
          <span className={`badge ${session.status === 'completed' ? 'badge-ok' : session.status === 'skipped' ? 'badge-warn' : 'badge-accent'}`}>
            {session.status === 'completed' ? 'Completada ✓' : session.status === 'skipped' ? 'Saltada' : 'En curso'}
          </span>
        )}
      </div>
      {session && <p className="muted small">Iniciado {fmtDateTime(session.started_at)}</p>}
      {!session && canWrite && (
        <Link href={`/athlete/workout/${dayId}/pre`} className="btn btn-primary btn-block" style={{ marginBottom: 12 }}>
          Comenzar entrenamiento →
        </Link>
      )}

      {exs.map((ex, i) => {
        const info = one(ex.exercises);
        const prev = prevByExercise.get(ex.exercise_id);
        return (
          <div className="card" key={ex.id} id={`ex-${ex.id}`}>
            <div className="row between">
              <h2 className="mb0">
                {i + 1}. {info?.name ?? 'Ejercicio'}
              </h2>
              {info?.video_url && (
                <a href={info.video_url} target="_blank" rel="noreferrer" className="btn btn-sm">
                  ▶ Video
                </a>
              )}
            </div>
            <div className="strong small" style={{ color: 'var(--accent)' }}>
              {prescriptionText(ex)}
            </div>
            {ex.block_note && <div className="small">📌 {ex.block_note}</div>}
            {ex.week_note && <div className="small">🗓 {ex.week_note}</div>}
            {prev && (
              <div className="prev">
                <strong>Rendimiento anterior</strong> ({fmtDate(prev.date)}):{' '}
                {prev.sets.map((l) => `${l.weight_kg ?? '—'} kg × ${l.reps ?? '—'}${l.rir !== null && l.rir !== undefined ? ` @${l.rir}` : ''}`).join(' · ')}
              </div>
            )}
            {session && (
              <div className="mt">
                <div className="set-row tiny muted">
                  <span className="n">#</span>
                  <span>Peso (kg)</span>
                  <span>Reps</span>
                  <span>RIR</span>
                  <span />
                </div>
                {Array.from({ length: Number(ex.sets) || 1 }, (_, k) => k + 1).map((n) => {
                  const l = logOf(ex.id, n);
                  return editable ? (
                    <form key={n} action={saveSet} className={`set-row ${l ? 'saved' : ''}`}>
                      <input type="hidden" name="sessionId" value={session.id} />
                      <input type="hidden" name="teId" value={ex.id} />
                      <input type="hidden" name="dayId" value={dayId} />
                      <input type="hidden" name="set_number" value={n} />
                      <span className="n">{n}</span>
                      <input name="weight_kg" inputMode="decimal" defaultValue={l?.weight_kg ?? ''} className="input-sm" />
                      <input name="reps" inputMode="numeric" defaultValue={l?.reps ?? ''} className="input-sm" />
                      <input name="rir" inputMode="decimal" defaultValue={l?.rir ?? ''} className="input-sm" />
                      <SubmitButton className="btn btn-sm" pendingText="…">
                        {l ? '✓' : 'Guardar'}
                      </SubmitButton>
                    </form>
                  ) : (
                    <div key={n} className="set-row small">
                      <span className="n">{n}</span>
                      <span>{l?.weight_kg ?? '—'}</span>
                      <span>{l?.reps ?? '—'}</span>
                      <span>{l?.rir ?? '—'}</span>
                      <span />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {exs.length === 0 && (
        <div className="card">
          <p className="muted mb0">Este día aún no tiene ejercicios.</p>
        </div>
      )}

      {session?.note && !active && <p className="small">📝 {session.note}</p>}

      {active && (
        <div className="card">
          <form action={finishSession} className="stack">
            <input type="hidden" name="sessionId" value={session.id} />
            <label className="field">
              Nota para tu coach (opcional)
              <textarea name="note" rows={2} defaultValue={session.note ?? ''} />
            </label>
            <SubmitButton className="btn btn-primary btn-lg btn-block" name="intent" value="finish" pendingText="Finalizando…">
              Finalizar entrenamiento ✓
            </SubmitButton>
            <SubmitButton className="btn btn-block" name="intent" value="skip" confirm="¿Marcar este entrenamiento como saltado?">
              Saltar
            </SubmitButton>
          </form>
          <form action={cancelSession} className="center mt">
            <input type="hidden" name="sessionId" value={session.id} />
            <SubmitButton className="btn btn-ghost btn-sm" confirm="¿Cancelar? Se borrarán las series registradas en esta sesión.">
              Cancelar entrenamiento
            </SubmitButton>
          </form>
        </div>
      )}
    </>
  );
}
