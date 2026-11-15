import { requireCoach } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { createField, createSection, deleteField, deleteSection, renameSection, updateField } from '../actions';
import { FIELD_TYPES } from '@/lib/checkin';
import type { Row } from '@/lib/utils';

function FieldForm({ f }: { f?: Row }) {
  return (
    <div className="ex-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
      <label className="field" style={{ gridColumn: 'span 2' }}>
        Pregunta
        <input name="label" defaultValue={f?.label ?? ''} required className="input-sm" />
      </label>
      <label className="field">
        Tipo
        <select name="field_type" defaultValue={f?.field_type ?? 'scale_1_5'} className="input-sm">
          {FIELD_TYPES.map((t) => (
            <option key={t.v} value={t.v}>
              {t.l}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Unidad
        <input name="unit" defaultValue={f?.unit ?? ''} className="input-sm" />
      </label>
      <label className="field" style={{ gridColumn: 'span 2' }}>
        Ayuda (opcional)
        <input name="help" defaultValue={f?.help ?? ''} className="input-sm" />
      </label>
      <label className="field" style={{ gridColumn: 'span 2' }}>
        Opciones (separadas por coma, para tipos con opciones)
        <input name="options" defaultValue={Array.isArray(f?.options) ? f!.options.join(', ') : ''} className="input-sm" />
      </label>
      <label className="field">
        Orden
        <input name="position" type="number" defaultValue={f?.position ?? 0} className="input-sm" />
      </label>
      <label className="field check">
        <input type="checkbox" name="weekly" defaultChecked={f?.weekly ?? false} /> Semanal
      </label>
      <label className="field check">
        <input type="checkbox" name="default_on" defaultChecked={f?.default_on ?? true} /> Prendido en nuevos
      </label>
    </div>
  );
}

export default async function CheckinFieldsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireCoach();
  const { data } = await supabase.from('checkin_sections').select('*, checkin_fields(*)').eq('coach_id', user.id).order('position');
  const sections: Row[] = data ?? [];
  sections.forEach((s) => s.checkin_fields.sort((a: Row, b: Row) => a.position - b.position));
  const back = '/coach/checkin-fields';

  return (
    <>
      <Flash sp={sp} />
      <h1>Campos de check-in</h1>
      <p className="muted small">
        Estas son las preguntas de todos tus alumnos. <strong>Diario</strong> = registro de cada día; <strong>Semanal</strong> = check-in que se envía una vez por semana.
        Por alumno puedes prender o apagar preguntas desde su ficha → Configurar check-in.
      </p>

      {sections.map((s) => (
        <div className="card" key={s.id}>
          <div className="card-head">
            <form action={renameSection} className="inline-form" style={{ flex: 1 }}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="back" value={back} />
              <label className="field" style={{ flex: '3 1 200px' }}>
                Sección
                <input name="name" defaultValue={s.name} className="input-sm" style={{ fontWeight: 700 }} />
              </label>
              <label className="field" style={{ flex: '0 1 80px' }}>
                Orden
                <input name="position" type="number" defaultValue={s.position} className="input-sm" />
              </label>
              <SubmitButton className="btn btn-sm">Guardar</SubmitButton>
            </form>
            <form action={deleteSection}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="back" value={back} />
              <SubmitButton className="btn btn-sm btn-danger" confirm={`¿Borrar la sección "${s.name}" y sus preguntas?`}>
                Borrar sección
              </SubmitButton>
            </form>
          </div>
          <ul className="list">
            {(s.checkin_fields as Row[]).map((f) => (
              <li key={f.id}>
                <details>
                  <summary>
                    {f.label} <span className="badge">{FIELD_TYPES.find((t) => t.v === f.field_type)?.l}</span>{' '}
                    <span className={`badge ${f.weekly ? 'badge-accent' : ''}`}>{f.weekly ? 'Semanal' : 'Diario'}</span>{' '}
                    {!f.default_on && <span className="badge badge-warn">Apagado en nuevos</span>}
                  </summary>
                  <form action={updateField} className="stack mt">
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="back" value={back} />
                    <FieldForm f={f} />
                    <div className="row end">
                      <SubmitButton className="btn btn-sm btn-primary">Guardar pregunta</SubmitButton>
                    </div>
                  </form>
                  <form action={deleteField} className="mt">
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="back" value={back} />
                    <SubmitButton className="btn btn-sm btn-danger" confirm="¿Borrar esta pregunta?">
                      Borrar pregunta
                    </SubmitButton>
                  </form>
                </details>
              </li>
            ))}
          </ul>
          <details className="box">
            <summary>+ Nueva pregunta en {s.name}</summary>
            <form action={createField} className="stack mt">
              <input type="hidden" name="sectionId" value={s.id} />
              <input type="hidden" name="back" value={back} />
              <FieldForm />
              <div className="row end">
                <SubmitButton className="btn btn-sm btn-primary">Crear pregunta</SubmitButton>
              </div>
            </form>
          </details>
        </div>
      ))}

      <div className="card soft">
        <form action={createSection} className="inline-form">
          <input type="hidden" name="back" value={back} />
          <label className="field">
            Nueva sección
            <input name="name" placeholder="Recuperación y fatiga" required />
          </label>
          <SubmitButton>+ Sección</SubmitButton>
        </form>
      </div>
    </>
  );
}
