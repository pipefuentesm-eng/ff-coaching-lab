import Link from 'next/link';
import { athleteContext } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { addDays, fmtDate } from '@/lib/dates';
import type { Row } from '@/lib/utils';
import { saveEnergyLog } from '../actions';

export default async function GastoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, athleteId, today, canWrite } = await athleteContext();
  const [{ data: goal }, { data: logs }] = await Promise.all([
    supabase.from('energy_goals').select('*').eq('athlete_id', athleteId).maybeSingle(),
    supabase.from('energy_logs').select('*').eq('athlete_id', athleteId).gte('log_date', addDays(today, -13)).order('log_date', { ascending: false }),
  ]);
  const todayLog = (logs ?? []).find((l: Row) => l.log_date === today);
  const from7 = addDays(today, -6);
  const cardio7 = (logs ?? []).filter((l: Row) => l.log_date >= from7).reduce((a: number, l: Row) => a + Number(l.cardio_min ?? 0), 0);

  return (
    <>
      <Flash sp={sp} />
      <Link href="/athlete/more" className="muted small">
        ← Más
      </Link>
      <h1 className="mt">Gasto calórico</h1>
      <div className="card dark">
        <div className="kpis four" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="kpi">
            <b>{goal?.steps_goal ?? '—'}</b>
            <span>Pasos / día</span>
          </div>
          <div className="kpi">
            <b>
              {cardio7}/{goal?.cardio_min_week ?? '—'}
            </b>
            <span>Cardio 7 días (min)</span>
          </div>
        </div>
        {goal?.notes && <p className="small mt mb0" style={{ whiteSpace: 'pre-wrap' }}>{goal.notes}</p>}
      </div>

      {canWrite && (
        <form action={saveEnergyLog} className="card stack">
          <h2>Hoy</h2>
          <div className="grid2">
            <label className="field">
              Pasos
              <input name="steps" inputMode="numeric" defaultValue={todayLog?.steps ?? ''} />
            </label>
            <label className="field">
              Cardio (min)
              <input name="cardio_min" inputMode="numeric" defaultValue={todayLog?.cardio_min ?? ''} />
            </label>
          </div>
          <SubmitButton>Guardar</SubmitButton>
        </form>
      )}

      <div className="card">
        <h2>Últimos 14 días</h2>
        {(logs ?? []).length === 0 ? (
          <p className="muted mb0">Sin registros todavía.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Pasos</th>
                <th>Cardio</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((l: Row) => (
                <tr key={l.id}>
                  <td>{fmtDate(l.log_date)}</td>
                  <td>
                    {l.steps ?? '—'} {goal?.steps_goal && Number(l.steps) >= goal.steps_goal ? '✓' : ''}
                  </td>
                  <td>{l.cardio_min ? `${l.cardio_min} min` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
