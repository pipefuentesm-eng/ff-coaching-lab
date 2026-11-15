import Link from 'next/link';
import { athleteContext } from '@/lib/auth';
import Flash from '@/components/Flash';
import { loadPlan, dayDone } from '@/lib/training';
import { WEEKDAYS, WEEKDAYS_LONG, WEEK_ORDER, addDays, fmtDate, minutesBetween, weekdayOf } from '@/lib/dates';
import type { Row } from '@/lib/utils';

function statusBadge(s: Row | undefined) {
  if (!s) return <span className="badge">Pendiente</span>;
  if (s.status === 'completed') return <span className="badge badge-ok">Completada ✓</span>;
  if (s.status === 'skipped') return <span className="badge badge-warn">Saltada</span>;
  return <span className="badge badge-accent">En curso</span>;
}

export default async function AthleteHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, athleteId, athlete, today } = await athleteContext();
  const { block, weeks, sessions, current } = await loadPlan(supabase, athleteId);
  const firstName = String(athlete.full_name ?? '').split(' ')[0];

  if (!block || !current) {
    return (
      <>
        <Flash sp={sp} />
        <h1>Hola, {firstName} 👋</h1>
        <div className="card">
          <p className="mb0">Tu coach todavía no publica tu programa de entrenamiento. Te avisaremos apenas esté listo.</p>
        </div>
      </>
    );
  }

  const days: Row[] = current.days;
  const done = days.filter((d) => dayDone(sessions.get(d.id))).length;
  const next = days.find((d) => sessions.get(d.id)?.status === 'in_progress') ?? days.find((d) => !dayDone(sessions.get(d.id)));
  const nextSession = next ? sessions.get(next.id) : undefined;
  const byWeekday = new Map<number, Row>();
  days.forEach((d) => {
    if (d.weekday !== null && !byWeekday.has(d.weekday)) byWeekday.set(d.weekday, d);
  });
  const todayWd = weekdayOf(today);
  const weekEnd = current.starts_on ? addDays(current.starts_on, 6) : null;
  const history = weeks.filter((w) => w.week_number < current.week_number).reverse();

  return (
    <>
      <Flash sp={sp} />
      <h1>Hola, {firstName} 👋</h1>

      <div className="card dark">
        <div className="label">Bloque activo</div>
        <h2 className="mb0">{block.name}</h2>
        <div className="muted small">
          Semana {current.week_number} · {done}/{days.length} entrenamientos
          {current.starts_on ? ` · ${fmtDate(current.starts_on)} – ${fmtDate(weekEnd)}` : ''}
        </div>
        <div className="strip">
          {WEEK_ORDER.map((wd) => {
            const d = byWeekday.get(wd);
            const s = d ? sessions.get(d.id) : undefined;
            return (
              <div key={wd} className={`d ${d ? (dayDone(s) ? 'done' : 'train') : ''} ${wd === todayWd ? 'today' : ''}`}>
                <b>{WEEKDAYS[wd]}</b>
                {d ? d.name : 'Off'}
              </div>
            );
          })}
        </div>
      </div>

      {next ? (
        <div className="card">
          <div className="label">Próximo</div>
          <h2 className="mb0">{next.name}</h2>
          <p className="muted small">
            {next.weekday !== null ? WEEKDAYS_LONG[next.weekday] : 'Sin día fijo'} · {(next.training_exercises as Row[]).length} ejercicios ·{' '}
            {(next.training_exercises as Row[]).reduce((a, e) => a + Number(e.sets || 0), 0)} series
          </p>
          <Link className="btn btn-primary btn-lg btn-block" href={nextSession ? `/athlete/workout/${next.id}` : `/athlete/workout/${next.id}/pre`}>
            {nextSession ? 'Continuar entrenamiento →' : 'Comenzar entrenamiento →'}
          </Link>
        </div>
      ) : (
        <div className="card">
          <p className="mb0">🎉 ¡Completaste todos los entrenamientos de esta semana!</p>
        </div>
      )}

      <div className="card">
        <h2>Esta semana</h2>
        <ul className="list">
          {days.map((d) => {
            const s = sessions.get(d.id);
            const mins = s ? minutesBetween(s.started_at, s.finished_at) : null;
            return (
              <li key={d.id}>
                <Link className="list-link" href={s ? `/athlete/workout/${d.id}` : `/athlete/workout/${d.id}/pre`}>
                  <div>
                    <strong>{d.name}</strong>
                    <div className="muted small">
                      {d.weekday !== null ? WEEKDAYS_LONG[d.weekday] : 'Sin día'}
                      {s && s.status === 'completed' ? ` · ${(s.set_logs ?? []).length} series${mins !== null ? ` · ${mins} min` : ''}` : ''}
                    </div>
                  </div>
                  {statusBadge(s)}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {history.length > 0 && (
        <div className="card">
          <h2>Historial</h2>
          {history.map((w) => (
            <details key={w.id} className="box">
              <summary>
                Semana {w.week_number}{' '}
                <span className="muted small">
                  · {(w.days as Row[]).filter((d) => sessions.get(d.id)?.status === 'completed').length}/{(w.days as Row[]).length} completados
                </span>
              </summary>
              <ul className="list">
                {(w.days as Row[]).map((d) => (
                  <li key={d.id}>
                    <Link className="list-link" href={`/athlete/workout/${d.id}`}>
                      <span>{d.name}</span>
                      {statusBadge(sessions.get(d.id))}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
