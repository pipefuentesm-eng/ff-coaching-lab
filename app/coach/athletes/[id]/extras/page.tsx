import Link from 'next/link';
import { requireCoachOf } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import {
  addAccessory,
  addSupplement,
  applyBasicTemplate,
  deleteAccessory,
  deleteSupplement,
  loadStandardAccessories,
  saveEnergyGoals,
  updateSupplement,
} from '../../../actions';
import { addDays, fmtDate, todayCL } from '@/lib/dates';
import type { Row } from '@/lib/utils';

function SuppFields({ s }: { s?: Row }) {
  return (
    <div className="ex-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
      <label className="field">
        Nombre
        <input name="name" defaultValue={s?.name ?? ''} required className="input-sm" />
      </label>
      <label className="field">
        Dosis
        <input name="dose" defaultValue={s?.dose ?? ''} className="input-sm" />
      </label>
      <label className="field">
        Momento
        <input name="timing" defaultValue={s?.timing ?? ''} className="input-sm" />
      </label>
      <label className="field">
        Tipo
        <select name="kind" defaultValue={s?.kind ?? 'required'} className="input-sm">
          <option value="required">Requerida</option>
          <option value="suggested">Sugerida</option>
        </select>
      </label>
      <label className="field" style={{ gridColumn: 'span 2' }}>
        Por qué (lo ve el alumno)
        <input name="why" defaultValue={s?.why ?? ''} className="input-sm" />
      </label>
      <label className="field" style={{ gridColumn: 'span 2' }}>
        Nota
        <input name="notes" defaultValue={s?.notes ?? ''} className="input-sm" />
      </label>
    </div>
  );
}

export default async function ExtrasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, athlete } = await requireCoachOf(id);
  const since = addDays(todayCL(), -13);
  const [{ data: goal }, { data: logs }, { data: supps }, { data: accs }, { data: checks }] = await Promise.all([
    supabase.from('energy_goals').select('*').eq('athlete_id', id).maybeSingle(),
    supabase.from('energy_logs').select('*').eq('athlete_id', id).gte('log_date', since).order('log_date', { ascending: false }),
    supabase.from('supplements').select('*').eq('athlete_id', id).order('position'),
    supabase.from('accessories').select('*').eq('athlete_id', id).order('position'),
    supabase.from('accessory_checks').select('*').eq('athlete_id', id),
  ]);
  const has = new Set((checks ?? []).map((c: Row) => c.accessory_id));
  const back = `/coach/athletes/${id}/extras`;

  return (
    <>
      <Flash sp={sp} />
      <Link href={`/coach/athletes/${id}`} className="muted small">
        ← {athlete.full_name}
      </Link>
      <h1 className="mt">Extras · {athlete.full_name}</h1>

      <div className="card">
        <h2>🔥 Gasto calórico</h2>
        <form action={saveEnergyGoals} className="stack">
          <input type="hidden" name="athleteId" value={id} />
          <input type="hidden" name="back" value={back} />
          <div className="grid2">
            <label className="field">
              Meta de pasos por día
              <input name="steps_goal" inputMode="numeric" defaultValue={goal?.steps_goal ?? ''} />
            </label>
            <label className="field">
              Meta de cardio por semana (min)
              <input name="cardio_min_week" inputMode="numeric" defaultValue={goal?.cardio_min_week ?? ''} />
            </label>
          </div>
          <label className="field">
            Indicaciones
            <textarea name="notes" rows={2} defaultValue={goal?.notes ?? ''} />
          </label>
          <div className="row end">
            <SubmitButton>Guardar metas</SubmitButton>
          </div>
        </form>
        {(logs ?? []).length > 0 && (
          <div className="table-wrap mt">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Pasos</th>
                  <th>Cardio (min)</th>
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).map((l: Row) => (
                  <tr key={l.id}>
                    <td>{fmtDate(l.log_date)}</td>
                    <td>
                      {l.steps ?? '—'} {goal?.steps_goal && l.steps >= goal.steps_goal ? '✓' : ''}
                    </td>
                    <td>{l.cardio_min ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>💊 Suplementación</h2>
          {(supps ?? []).length === 0 && (
            <form action={applyBasicTemplate}>
              <input type="hidden" name="athleteId" value={id} />
              <input type="hidden" name="back" value={back} />
              <SubmitButton className="btn btn-sm">Aplicar plantilla Básica</SubmitButton>
            </form>
          )}
        </div>
        <ul className="list">
          {(supps ?? []).map((s: Row) => (
            <li key={s.id}>
              <details>
                <summary>
                  {s.name} <span className={`badge ${s.kind === 'required' ? 'badge-accent' : ''}`}>{s.kind === 'required' ? 'Requerida' : 'Sugerida'}</span>{' '}
                  <span className="muted small">
                    {[s.dose, s.timing].filter(Boolean).join(' · ')}
                  </span>
                </summary>
                <form action={updateSupplement} className="stack mt">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="back" value={back} />
                  <SuppFields s={s} />
                  <div className="row end">
                    <SubmitButton className="btn btn-sm btn-primary">Guardar</SubmitButton>
                  </div>
                </form>
                <form action={deleteSupplement} className="mt">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="back" value={back} />
                  <SubmitButton className="btn btn-sm btn-danger" confirm={`¿Quitar ${s.name}?`}>
                    Quitar
                  </SubmitButton>
                </form>
              </details>
            </li>
          ))}
        </ul>
        <details className="box">
          <summary>+ Agregar suplemento</summary>
          <form action={addSupplement} className="stack mt">
            <input type="hidden" name="athleteId" value={id} />
            <input type="hidden" name="back" value={back} />
            <SuppFields />
            <div className="row end">
              <SubmitButton className="btn btn-sm btn-primary">Agregar</SubmitButton>
            </div>
          </form>
        </details>
        <p className="muted tiny mb0">Textos editables por ti; no constituyen indicación médica.</p>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>🎒 Accesorios</h2>
          <form action={loadStandardAccessories}>
            <input type="hidden" name="athleteId" value={id} />
            <input type="hidden" name="back" value={back} />
            <SubmitButton className="btn btn-sm">Cargar estándar</SubmitButton>
          </form>
        </div>
        <ul className="list">
          {(accs ?? []).map((a: Row) => (
            <li key={a.id} className="row between">
              <div>
                <strong>{a.name}</strong> {has.has(a.id) ? <span className="badge badge-ok">Lo tiene ✓</span> : <span className="badge">Aún no</span>}
                {a.note && <div className="muted small">{a.note}</div>}
              </div>
              <form action={deleteAccessory}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="back" value={back} />
                <SubmitButton className="btn btn-sm btn-ghost" confirm={`¿Quitar ${a.name}?`} pendingText="…">
                  ✕
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
        <form action={addAccessory} className="inline-form mt">
          <input type="hidden" name="athleteId" value={id} />
          <input type="hidden" name="back" value={back} />
          <label className="field">
            Accesorio
            <input name="name" required />
          </label>
          <label className="field">
            Nota
            <input name="note" />
          </label>
          <SubmitButton className="btn btn-sm btn-primary">Agregar</SubmitButton>
        </form>
      </div>
    </>
  );
}
