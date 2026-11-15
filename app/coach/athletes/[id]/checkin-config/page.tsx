import Link from 'next/link';
import { requireCoachOf } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { resetCheckinConfig, saveCheckinConfig } from '../../../actions';
import { fieldOn } from '@/lib/checkin';
import type { Row } from '@/lib/utils';

export default async function CheckinConfigPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, athlete } = await requireCoachOf(id);
  const [{ data: secs }, { data: ov }] = await Promise.all([
    supabase.from('checkin_sections').select('*, checkin_fields(*)').eq('coach_id', user.id).order('position'),
    supabase.from('athlete_checkin_fields').select('*').eq('athlete_id', id),
  ]);
  const overrides = new Map<string, boolean>((ov ?? []).map((o: Row) => [o.field_id, o.enabled]));
  const sections: Row[] = secs ?? [];
  sections.forEach((s) => s.checkin_fields.sort((a: Row, b: Row) => a.position - b.position));
  const allIds = sections.flatMap((s) => (s.checkin_fields as Row[]).map((f) => f.id));
  const back = `/coach/athletes/${id}/checkin-config`;

  const block = (weekly: boolean) =>
    sections.map((s) => {
      const fields = (s.checkin_fields as Row[]).filter((f) => f.weekly === weekly);
      if (fields.length === 0) return null;
      return (
        <div key={s.id + String(weekly)} style={{ marginBottom: 10 }}>
          <div className="label">{s.name}</div>
          {fields.map((f) => (
            <label key={f.id} className="field check" style={{ padding: '4px 0' }}>
              <input type="checkbox" name={'on_' + f.id} defaultChecked={fieldOn(f, overrides)} />
              {f.label}
              {overrides.has(f.id) && <span className="badge tiny">personalizado</span>}
            </label>
          ))}
        </div>
      );
    });

  return (
    <>
      <Flash sp={sp} />
      <Link href={`/coach/athletes/${id}`} className="muted small">
        ← {athlete.full_name}
      </Link>
      <h1 className="mt">Configurar check-in · {athlete.full_name}</h1>
      <p className="muted small">Marca las preguntas que este alumno ve. Lo que no personalices sigue el valor “Prendido en nuevos” del editor global.</p>
      <form action={saveCheckinConfig}>
        <input type="hidden" name="athleteId" value={id} />
        <input type="hidden" name="fieldIds" value={allIds.join(',')} />
        <input type="hidden" name="back" value={back} />
        <div className="grid2">
          <div className="card">
            <h2>Registro diario</h2>
            {block(false)}
          </div>
          <div className="card">
            <h2>Check-in semanal</h2>
            {block(true)}
          </div>
        </div>
        <div className="row end">
          <SubmitButton>Guardar configuración</SubmitButton>
        </div>
      </form>
      <form action={resetCheckinConfig} className="row end mt">
        <input type="hidden" name="athleteId" value={id} />
        <input type="hidden" name="back" value={back} />
        <SubmitButton className="btn btn-sm" confirm="¿Volver a los valores por defecto?">
          Restablecer
        </SubmitButton>
      </form>
    </>
  );
}
