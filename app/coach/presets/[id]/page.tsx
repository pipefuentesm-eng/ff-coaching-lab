import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCoach } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import ExerciseEditor, { ExerciseSelect, PrescriptionFields } from '@/components/ExerciseEditor';
import {
  addPresetDay,
  addPresetExercise,
  deletePreset,
  deletePresetDay,
  deletePresetExercise,
  movePresetExercise,
  updatePreset,
  updatePresetDay,
  updatePresetExercise,
} from '../../actions';
import { WEEKDAYS_LONG, WEEK_ORDER, weekdaySortKey } from '@/lib/dates';
import type { Row } from '@/lib/utils';

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

export default async function PresetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user } = await requireCoach();
  const { data: preset } = await supabase.from('program_presets').select('*').eq('id', id).eq('coach_id', user.id).maybeSingle();
  if (!preset) notFound();
  const [{ data: daysRaw }, { data: library }] = await Promise.all([
    supabase.from('preset_days').select('*, preset_exercises(*)').eq('preset_id', id).order('position'),
    supabase.from('exercises').select('*').eq('coach_id', user.id).order('name'),
  ]);
  const days = (daysRaw ?? []).sort((a: Row, b: Row) => weekdaySortKey(a.weekday) - weekdaySortKey(b.weekday) || a.position - b.position);
  days.forEach((d: Row) => d.preset_exercises.sort((a: Row, b: Row) => a.position - b.position));
  const back = `/coach/presets/${id}`;

  return (
    <>
      <Flash sp={sp} />
      <Link href="/coach/presets" className="muted small">
        ← Presets
      </Link>
      <div className="card mt">
        <form action={updatePreset} className="inline-form">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="back" value={back} />
          <label className="field">
            Nombre
            <input name="name" defaultValue={preset.name} />
          </label>
          <label className="field">
            Descripción
            <input name="description" defaultValue={preset.description ?? ''} />
          </label>
          <SubmitButton className="btn btn-sm btn-primary">Guardar</SubmitButton>
        </form>
        <form action={deletePreset} className="mt">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="back" value={back} />
          <SubmitButton className="btn btn-sm btn-danger" confirm="¿Eliminar este preset? Los bloques ya creados no se modifican.">
            Eliminar preset
          </SubmitButton>
        </form>
      </div>

      {days.map((d: Row) => {
        const exs: Row[] = d.preset_exercises;
        return (
          <div className="card" key={d.id}>
            <div className="card-head">
              <form action={updatePresetDay} className="inline-form" style={{ flex: 1 }}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="back" value={back} />
                <label className="field">
                  Día
                  <input name="name" defaultValue={d.name} className="input-sm" />
                </label>
                <label className="field">
                  Día de la semana
                  <WeekdaySelect value={d.weekday} />
                </label>
                <SubmitButton className="btn btn-sm">Guardar</SubmitButton>
              </form>
              <form action={deletePresetDay}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="back" value={back} />
                <SubmitButton className="btn btn-sm btn-danger" confirm={`¿Eliminar "${d.name}"?`}>
                  Eliminar día
                </SubmitButton>
              </form>
            </div>
            {exs.map((ex, i) => (
              <ExerciseEditor
                key={ex.id}
                ex={ex}
                library={library ?? []}
                back={back}
                parentId={d.id}
                index={i}
                total={exs.length}
                weekNote={false}
                onUpdate={updatePresetExercise}
                onDelete={deletePresetExercise}
                onMove={movePresetExercise}
              />
            ))}
            <details className="box">
              <summary>+ Agregar ejercicio</summary>
              <form action={addPresetExercise} className="stack mt">
                <input type="hidden" name="dayId" value={d.id} />
                <input type="hidden" name="back" value={back} />
                <ExerciseSelect library={library ?? []} />
                <PrescriptionFields weekNote={false} />
                <div className="row end">
                  <SubmitButton className="btn btn-primary btn-sm">Agregar</SubmitButton>
                </div>
              </form>
            </details>
          </div>
        );
      })}

      <div className="card soft">
        <h3>Agregar día</h3>
        <form action={addPresetDay} className="inline-form">
          <input type="hidden" name="presetId" value={id} />
          <input type="hidden" name="back" value={back} />
          <label className="field">
            Nombre
            <input name="name" placeholder="Lower A" required />
          </label>
          <label className="field">
            Día
            <WeekdaySelect value={null} />
          </label>
          <SubmitButton>Agregar día</SubmitButton>
        </form>
      </div>
    </>
  );
}
