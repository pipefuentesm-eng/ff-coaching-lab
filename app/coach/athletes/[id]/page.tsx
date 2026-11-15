import Link from 'next/link';
import { requireCoachOf } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import ExerciseEditor, { ExerciseSelect, PrescriptionFields } from '@/components/ExerciseEditor';
import { enterViewAs, updateAthleteProfile } from '../../actions';
import {
  addDay,
  addTrainingExercise,
  copyPresetDay,
  createBlock,
  deleteDay,
  deleteTrainingExercise,
  deleteWeek,
  duplicateWeek,
  finishBlock,
  moveTrainingExercise,
  saveBlockAsPreset,
  updateDay,
  updateTrainingExercise,
  updateWeek,
} from '../../training-actions';
import { WEEKDAYS_LONG, WEEK_ORDER, fmtDate, fmtDateTime, minutesBetween, todayCL, weekdaySortKey } from '@/lib/dates';
import { one, type Row } from '@/lib/utils';

function WeekdaySelect({ value }: { value: number | null }) {
  return (
    <select name="weekday" defaultValue={value === null || value === undefined ? '' : String(value)}>
      <option value="">Sin día</option>
      {WEEK_ORDER.map((d) => (
        <option key={d} value={d}>
          {WEEKDAYS_LONG[d]}
        </option>
      ))}
    </select>
  );
}

function setsByMuscle(exs: Row[], lib: Map<string, Row>): [string, number][] {
  const m = new Map<string, number>();
  for (const e of exs) {
    const g = lib.get(e.exercise_id)?.muscle_group ?? 'Otro';
    m.set(g, (m.get(g) ?? 0) + Number(e.sets || 0));
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const SURVEY_LABELS: Record<string, string> = {
  sleep_h: 'Horas de sueño',
  sleep_q: 'Calidad de sueño',
  energy: 'Energía',
  stress: 'Estrés',
  pain: 'Dolores',
  note: 'Nota',
};

export default async function AthletePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, athlete } = await requireCoachOf(id);

  const [{ data: library }, { data: presets }, { data: blocks }] = await Promise.all([
    supabase.from('exercises').select('*').eq('coach_id', user.id).order('name'),
    supabase.from('program_presets').select('id,name,preset_days(id,name,position)').eq('coach_id', user.id).order('name'),
    supabase.from('training_blocks').select('*').eq('athlete_id', id).order('created_at', { ascending: false }),
  ]);
  const lib = new Map<string, Row>((library ?? []).map((e: Row) => [e.id, e]));
  const block: Row | undefined = (blocks ?? []).find((b: Row) => b.status === 'active');
  const finished = (blocks ?? []).filter((b: Row) => b.status !== 'active');

  let weeks: Row[] = [];
  let week: Row | undefined;
  let days: Row[] = [];
  if (block) {
    const { data } = await supabase.from('training_weeks').select('*').eq('block_id', block.id).order('week_number');
    weeks = data ?? [];
    const wanted = Number(sp.week);
    week = weeks.find((w) => w.week_number === wanted) ?? weeks[weeks.length - 1];
    if (week) {
      const { data: d } = await supabase
        .from('training_days')
        .select('*, training_exercises(*)')
        .eq('week_id', week.id)
        .order('position');
      days = (d ?? []).sort((a: Row, b: Row) => weekdaySortKey(a.weekday) - weekdaySortKey(b.weekday) || a.position - b.position);
      days.forEach((dd) => dd.training_exercises.sort((a: Row, b: Row) => a.position - b.position));
    }
  }

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('*, training_days(name), set_logs(*, training_exercises(exercise_id))')
    .eq('athlete_id', id)
    .order('started_at', { ascending: false })
    .limit(15);

  const back = `/coach/athletes/${id}${week ? `?week=${week.week_number}` : ''}`;
  const allWeekExercises = days.flatMap((d) => d.training_exercises as Row[]);
  const weekSummary = setsByMuscle(allWeekExercises, lib);
  const totalSets = weekSummary.reduce((a, [, n]) => a + n, 0);
  const today = todayCL();

  return (
    <>
      <Flash sp={sp} />
      <div className="card-head">
        <div>
          <Link href="/coach/athletes" className="muted small">
            ← Mis atletas
          </Link>
          <h1 className="mb0">{athlete.full_name}</h1>
          <div className="muted small">
            {athlete.phone ?? ''} {athlete.birth_date ? `· nac. ${fmtDate(athlete.birth_date)}` : ''}{' '}
            {!athlete.active && <span className="badge">Inactivo</span>}
            {athlete.access_from && today < athlete.access_from && <span className="badge badge-warn">Parte el {fmtDate(athlete.access_from)}</span>}
          </div>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <Link className="btn" href={`/coach/athletes/${id}/nutrition`}>
          🥗 Nutrición
        </Link>
        <Link className="btn" href={`/coach/athletes/${id}/checkin`}>
          ✅ Check-in
        </Link>
        <Link className="btn" href={`/coach/athletes/${id}/checkin-config`}>
          ⚙️ Configurar check-in
        </Link>
        <Link className="btn" href={`/coach/athletes/${id}/extras`}>
          🔥 Gasto · Suplementos · Accesorios
        </Link>
        <form action={enterViewAs}>
          <input type="hidden" name="athleteId" value={id} />
          <input type="hidden" name="back" value={back} />
          <SubmitButton className="btn btn-dark" pendingText="Abriendo…">
            👁 Ver como atleta
          </SubmitButton>
        </form>
      </div>

      {/* Datos del alumno */}
      <details className="box">
        <summary>Datos del alumno · habilitación · agua · check-in</summary>
        <form action={updateAthleteProfile} className="stack mt">
          <input type="hidden" name="athleteId" value={id} />
          <input type="hidden" name="back" value={back} />
          <div className="grid2">
            <label className="field">
              Nombre
              <input name="full_name" defaultValue={athlete.full_name} />
            </label>
            <label className="field">
              Habilitado desde (vacío = habilitado)
              <input name="access_from" type="date" defaultValue={athlete.access_from ?? ''} />
            </label>
            <label className="field">
              Día de check-in
              <select name="checkin_day" defaultValue={athlete.checkin_day === null ? '' : String(athlete.checkin_day)}>
                <option value="">Sin definir</option>
                {WEEK_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {WEEKDAYS_LONG[d]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Meta de agua (L/día · vacío = 3 L)
              <input name="water_goal_l" inputMode="decimal" defaultValue={athlete.water_goal_l ?? ''} />
            </label>
          </div>
          <label className="field check">
            <input type="checkbox" name="active" defaultChecked={athlete.active} /> Alumno activo
          </label>
          <div className="row end">
            <SubmitButton>Guardar datos</SubmitButton>
          </div>
        </form>
      </details>

      {/* Bloque */}
      {!block ? (
        <div className="card">
          <h2>Crear bloque de entrenamiento</h2>
          <form action={createBlock} className="stack">
            <input type="hidden" name="athleteId" value={id} />
            <input type="hidden" name="back" value={back} />
            <div className="grid3">
              <label className="field">
                Nombre del bloque
                <input name="name" placeholder="Hipertrofia 1" required />
              </label>
              <label className="field">
                Inicio semana 1
                <input name="starts_on" type="date" />
              </label>
              <label className="field">
                Desde preset (opcional)
                <select name="preset_id" defaultValue="">
                  <option value="">Bloque vacío</option>
                  {(presets ?? []).map((p: Row) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="row end">
              <SubmitButton pendingText="Creando…">Crear bloque</SubmitButton>
            </div>
          </form>
          {finished.length > 0 && <p className="muted small mt mb0">Bloques anteriores: {finished.map((b: Row) => b.name).join(' · ')}</p>}
        </div>
      ) : (
        <div className="card">
          <div className="card-head">
            <div>
              <div className="label">Bloque activo</div>
              <h2 className="mb0">{block.name}</h2>
            </div>
            <div className="row">
              <details>
                <summary className="small">Guardar como preset</summary>
                <form action={saveBlockAsPreset} className="row mt">
                  <input type="hidden" name="blockId" value={block.id} />
                  <input type="hidden" name="back" value={back} />
                  <input name="name" placeholder="Nombre del preset" defaultValue={block.name} className="input-sm" />
                  <SubmitButton className="btn btn-sm">Guardar</SubmitButton>
                </form>
              </details>
              <form action={finishBlock}>
                <input type="hidden" name="blockId" value={block.id} />
                <input type="hidden" name="athleteId" value={id} />
                <input type="hidden" name="back" value={back} />
                <SubmitButton className="btn btn-sm btn-danger" confirm="¿Finalizar este bloque? El alumno dejará de verlo como activo.">
                  Finalizar bloque
                </SubmitButton>
              </form>
            </div>
          </div>

          {/* Semanas */}
          <div className="tabs">
            {weeks.map((w) => (
              <Link key={w.id} href={`/coach/athletes/${id}?week=${w.week_number}`} className={`tab ${w.id === week?.id ? 'active' : ''}`}>
                Semana {w.week_number}
              </Link>
            ))}
          </div>

          {week && (
            <>
              <div className="row between">
                <form action={updateWeek} className="inline-form">
                  <input type="hidden" name="weekId" value={week.id} />
                  <input type="hidden" name="back" value={back} />
                  <label className="field">
                    Inicio semana {week.week_number}
                    <input type="date" name="starts_on" defaultValue={week.starts_on ?? ''} className="input-sm" />
                  </label>
                  <SubmitButton className="btn btn-sm">Guardar fecha</SubmitButton>
                </form>
                <div className="row">
                  <form action={duplicateWeek}>
                    <input type="hidden" name="weekId" value={week.id} />
                    <input type="hidden" name="athleteId" value={id} />
                    <input type="hidden" name="back" value={back} />
                    <SubmitButton className="btn btn-primary" pendingText="Duplicando…">
                      Duplicar → Semana {week.week_number + 1}
                    </SubmitButton>
                  </form>
                  {weeks.length > 1 && (
                    <form action={deleteWeek}>
                      <input type="hidden" name="weekId" value={week.id} />
                      <input type="hidden" name="athleteId" value={id} />
                      <input type="hidden" name="back" value={back} />
                      <SubmitButton className="btn btn-sm btn-danger" confirm={`¿Eliminar la semana ${week.week_number}?`}>
                        Eliminar semana
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>

              <div className="card soft mt">
                <div className="row between">
                  <strong>Resumen semana {week.week_number}</strong>
                  <span className="badge badge-accent">{totalSets} series totales</span>
                </div>
                {weekSummary.length === 0 ? (
                  <p className="muted small mb0 mt">Sin ejercicios aún.</p>
                ) : (
                  <div className="row mt">
                    {weekSummary.map(([g, n]) => (
                      <span key={g} className="badge">
                        {g}: {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Días */}
      {block && week && (
        <>
          {days.map((d) => {
            const exs: Row[] = d.training_exercises;
            const sum = setsByMuscle(exs, lib);
            return (
              <div className="card" key={d.id}>
                <div className="card-head">
                  <div>
                    <h2 className="mb0">
                      {d.name} <span className="muted small">· {d.weekday === null ? 'Sin día' : WEEKDAYS_LONG[d.weekday]}</span>
                    </h2>
                    <div className="muted small">
                      {exs.length} ejercicios · {sum.map(([g, n]) => `${g} ${n}`).join(' · ') || 'sin series'}
                    </div>
                  </div>
                  <form action={deleteDay}>
                    <input type="hidden" name="dayId" value={d.id} />
                    <input type="hidden" name="back" value={back} />
                    <SubmitButton className="btn btn-sm btn-danger" confirm={`¿Eliminar el día "${d.name}" y todo lo registrado en él?`}>
                      Eliminar día
                    </SubmitButton>
                  </form>
                </div>
                <details>
                  <summary className="small">Renombrar / cambiar día</summary>
                  <form action={updateDay} className="inline-form mt">
                    <input type="hidden" name="dayId" value={d.id} />
                    <input type="hidden" name="back" value={back} />
                    <label className="field">
                      Nombre
                      <input name="name" defaultValue={d.name} className="input-sm" />
                    </label>
                    <label className="field">
                      Día
                      <WeekdaySelect value={d.weekday} />
                    </label>
                    <SubmitButton className="btn btn-sm">Guardar</SubmitButton>
                  </form>
                </details>
                <div className="mt">
                  {exs.map((ex, i) => (
                    <ExerciseEditor
                      key={ex.id}
                      ex={ex}
                      library={library ?? []}
                      back={back}
                      parentId={d.id}
                      index={i}
                      total={exs.length}
                      weekNote
                      onUpdate={updateTrainingExercise}
                      onDelete={deleteTrainingExercise}
                      onMove={moveTrainingExercise}
                    />
                  ))}
                </div>
                <details className="box">
                  <summary>+ Agregar ejercicio</summary>
                  <form action={addTrainingExercise} className="stack mt">
                    <input type="hidden" name="dayId" value={d.id} />
                    <input type="hidden" name="back" value={back} />
                    <ExerciseSelect library={library ?? []} />
                    <PrescriptionFields weekNote />
                    <div className="row end">
                      <SubmitButton className="btn btn-primary btn-sm">Agregar</SubmitButton>
                    </div>
                  </form>
                </details>
              </div>
            );
          })}

          <div className="card soft">
            <h3>Agregar día a la semana {week.week_number}</h3>
            <form action={addDay} className="inline-form">
              <input type="hidden" name="weekId" value={week.id} />
              <input type="hidden" name="back" value={back} />
              <label className="field">
                Nombre
                <input name="name" placeholder="Upper A" required />
              </label>
              <label className="field">
                Día
                <WeekdaySelect value={null} />
              </label>
              <SubmitButton className="btn btn-primary">Agregar día</SubmitButton>
            </form>
            {(presets ?? []).length > 0 && (
              <form action={copyPresetDay} className="inline-form mt">
                <input type="hidden" name="weekId" value={week.id} />
                <input type="hidden" name="back" value={back} />
                <label className="field">
                  Copiar día desde un preset
                  <select name="preset_day_id" defaultValue="">
                    <option value="">— Elegir —</option>
                    {(presets ?? []).map((p: Row) => (
                      <optgroup key={p.id} label={p.name}>
                        {((p.preset_days ?? []) as Row[])
                          .sort((a, b) => a.position - b.position)
                          .map((pd) => (
                            <option key={pd.id} value={pd.id}>
                              {pd.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <SubmitButton className="btn">Copiar día</SubmitButton>
              </form>
            )}
          </div>
        </>
      )}

      {/* Sesiones */}
      <div className="card">
        <h2>Sesiones del alumno</h2>
        {(sessions ?? []).length === 0 ? (
          <p className="muted mb0">Todavía no registra entrenamientos.</p>
        ) : (
          (sessions ?? []).map((s: Row) => {
            const logs: Row[] = (s.set_logs ?? []).slice().sort((a: Row, b: Row) => a.set_number - b.set_number);
            const byEx = new Map<string, Row[]>();
            for (const l of logs) {
              const exId = one(l.training_exercises)?.exercise_id as string;
              if (!byEx.has(exId)) byEx.set(exId, []);
              byEx.get(exId)!.push(l);
            }
            const mins = minutesBetween(s.started_at, s.finished_at);
            return (
              <details key={s.id} className="box">
                <summary>
                  {one(s.training_days)?.name ?? 'Día'} · {fmtDateTime(s.started_at)}{' '}
                  <span className={`badge ${s.status === 'completed' ? 'badge-ok' : s.status === 'skipped' ? 'badge-warn' : 'badge-accent'}`}>
                    {s.status === 'completed' ? 'Completada' : s.status === 'skipped' ? 'Saltada' : 'En curso'}
                  </span>{' '}
                  <span className="muted small">
                    {logs.length} series{mins !== null ? ` · ${mins} min` : ''}
                  </span>
                </summary>
                {s.survey && (
                  <div className="prev">
                    <strong>Antes de entrenar:</strong>{' '}
                    {Object.entries(s.survey as Row)
                      .filter(([, v]) => v !== '' && v !== null)
                      .map(([k, v]) => `${SURVEY_LABELS[k] ?? k}: ${v}`)
                      .join(' · ')}
                  </div>
                )}
                {[...byEx.entries()].map(([exId, ls]) => (
                  <div key={exId} className="small" style={{ marginBottom: 4 }}>
                    <strong>{lib.get(exId)?.name ?? 'Ejercicio'}:</strong>{' '}
                    {ls.map((l) => `${l.weight_kg ?? '—'} kg × ${l.reps ?? '—'}${l.rir !== null ? ` @${l.rir}` : ''}`).join(' · ')}
                  </div>
                ))}
                {s.note && <p className="small mt mb0">📝 {s.note}</p>}
              </details>
            );
          })
        )}
      </div>
    </>
  );
}
