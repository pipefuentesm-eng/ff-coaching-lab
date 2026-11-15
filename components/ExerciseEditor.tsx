import SubmitButton from './SubmitButton';
import type { Row } from '@/lib/utils';

type Action = (fd: FormData) => Promise<void>;

/** Select de la biblioteca agrupado por músculo. */
export function ExerciseSelect({ library, name = 'exercise_id', value, placeholder }: { library: Row[]; name?: string; value?: string; placeholder?: string }) {
  const groups = new Map<string, Row[]>();
  for (const e of library) {
    if (!groups.has(e.muscle_group)) groups.set(e.muscle_group, []);
    groups.get(e.muscle_group)!.push(e);
  }
  return (
    <select name={name} defaultValue={value ?? ''}>
      <option value="">{placeholder ?? '— Elegir ejercicio —'}</option>
      {[...groups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([g, list]) => (
          <optgroup key={g} label={g}>
            {list.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </optgroup>
        ))}
    </select>
  );
}

/** Campos de prescripción (series, reps, RIR, descanso, RP, AR, tempo, notas). */
export function PrescriptionFields({ ex, weekNote }: { ex?: Row; weekNote: boolean }) {
  const v = (k: string) => (ex?.[k] ?? '') as string | number;
  return (
    <div className="ex-grid">
      <label className="field">
        Series
        <input className="input-sm" name="sets" type="number" min={1} defaultValue={v('sets') || 3} />
      </label>
      <label className="field">
        Reps mín
        <input className="input-sm" name="reps_min" type="number" min={0} defaultValue={v('reps_min')} />
      </label>
      <label className="field">
        Reps máx
        <input className="input-sm" name="reps_max" type="number" min={0} defaultValue={v('reps_max')} />
      </label>
      <label className="field">
        RIR
        <input className="input-sm" name="rir" inputMode="decimal" defaultValue={v('rir')} />
      </label>
      <label className="field">
        Desc. mín (min)
        <input className="input-sm" name="rest_min_min" inputMode="decimal" defaultValue={v('rest_min_min')} />
      </label>
      <label className="field">
        Desc. máx (min)
        <input className="input-sm" name="rest_max_min" inputMode="decimal" defaultValue={v('rest_max_min')} />
      </label>
      <label className="field">
        RP (reps)
        <input className="input-sm" name="rest_pause_reps" type="number" min={0} defaultValue={v('rest_pause_reps') || 0} />
      </label>
      <label className="field">
        AR Set
        <input className="input-sm" name="ar_set" defaultValue={v('ar_set')} />
      </label>
      <label className="field">
        Tempo
        <input className="input-sm" name="tempo" placeholder="21X1" defaultValue={v('tempo')} />
      </label>
      <label className="field" style={{ gridColumn: 'span 2' }}>
        Nota del bloque
        <input className="input-sm" name="block_note" defaultValue={v('block_note')} />
      </label>
      {weekNote && (
        <label className="field" style={{ gridColumn: 'span 2' }}>
          Nota de esta semana
          <input className="input-sm" name="week_note" defaultValue={v('week_note')} />
        </label>
      )}
    </div>
  );
}

export function prescriptionText(ex: Row): string {
  const reps = ex.reps_min && ex.reps_max && ex.reps_min !== ex.reps_max ? `${ex.reps_min}–${ex.reps_max}` : ex.reps_min ?? ex.reps_max ?? '?';
  let s = `${ex.sets} × ${reps}`;
  if (ex.rir !== null && ex.rir !== undefined) s += ` @ RIR ${ex.rir}`;
  if (ex.rest_min_min || ex.rest_max_min) {
    const r = ex.rest_min_min && ex.rest_max_min && ex.rest_min_min !== ex.rest_max_min ? `${ex.rest_min_min}–${ex.rest_max_min}` : ex.rest_min_min ?? ex.rest_max_min;
    s += ` · desc. ${r} min`;
  }
  if (ex.tempo) s += ` · tempo ${ex.tempo}`;
  if (ex.rest_pause_reps) s += ` · RP ${ex.rest_pause_reps}`;
  if (ex.ar_set) s += ` · AR ${ex.ar_set}`;
  return s;
}

/** Tarjeta editable de un ejercicio del programa o del preset. */
export default function ExerciseEditor({
  ex,
  library,
  back,
  parentId,
  index,
  total,
  weekNote,
  onUpdate,
  onDelete,
  onMove,
}: {
  ex: Row;
  library: Row[];
  back: string;
  parentId: string;
  index: number;
  total: number;
  weekNote: boolean;
  onUpdate: Action;
  onDelete: Action;
  onMove: Action;
}) {
  const current = library.find((l) => l.id === ex.exercise_id);
  return (
    <div className="ex-card">
      <div className="row between mb0">
        <div>
          <strong>
            {index + 1}. {current?.name ?? 'Ejercicio'}
          </strong>{' '}
          <span className="badge">{current?.muscle_group ?? '—'}</span>
          <div className="muted small">{prescriptionText(ex)}</div>
        </div>
        <div className="row">
          {index > 0 && (
            <form action={onMove}>
              <input type="hidden" name="id" value={ex.id} />
              <input type="hidden" name="parentId" value={parentId} />
              <input type="hidden" name="dir" value="up" />
              <input type="hidden" name="back" value={back} />
              <SubmitButton className="btn btn-sm" pendingText="…">
                ↑
              </SubmitButton>
            </form>
          )}
          {index < total - 1 && (
            <form action={onMove}>
              <input type="hidden" name="id" value={ex.id} />
              <input type="hidden" name="parentId" value={parentId} />
              <input type="hidden" name="dir" value="down" />
              <input type="hidden" name="back" value={back} />
              <SubmitButton className="btn btn-sm" pendingText="…">
                ↓
              </SubmitButton>
            </form>
          )}
          <form action={onDelete}>
            <input type="hidden" name="id" value={ex.id} />
            <input type="hidden" name="back" value={back} />
            <SubmitButton className="btn btn-sm btn-danger" confirm="¿Eliminar este ejercicio? Se borran también sus series registradas." pendingText="…">
              Eliminar
            </SubmitButton>
          </form>
        </div>
      </div>
      <details className="mt">
        <summary className="small">Editar</summary>
        <form action={onUpdate} className="stack mt">
          <input type="hidden" name="id" value={ex.id} />
          <input type="hidden" name="back" value={back} />
          <label className="field">
            Cambiar ejercicio
            <ExerciseSelect library={library} value={ex.exercise_id} />
          </label>
          <PrescriptionFields ex={ex} weekNote={weekNote} />
          <div className="row end">
            <SubmitButton className="btn btn-primary btn-sm">Guardar</SubmitButton>
          </div>
        </form>
      </details>
    </div>
  );
}
