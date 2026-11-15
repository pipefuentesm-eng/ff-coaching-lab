import Link from 'next/link';
import { requireCoach } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { createPreset } from '../actions';
import type { Row } from '@/lib/utils';

export default async function PresetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireCoach();
  const { data } = await supabase
    .from('program_presets')
    .select('*, preset_days(id)')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <>
      <Flash sp={sp} />
      <h1>Programas preset</h1>
      <p className="muted small">
        Plantillas reutilizables. Úsalas al crear el bloque de un alumno, o copia días sueltos a una semana. También puedes guardar el bloque de un alumno como preset desde su ficha.
      </p>
      <div className="card">
        <h2>Nuevo preset</h2>
        <form action={createPreset} className="inline-form">
          <input type="hidden" name="back" value="/coach/presets" />
          <label className="field">
            Nombre
            <input name="name" placeholder="Upper/Lower 4 días" required />
          </label>
          <label className="field">
            Descripción
            <input name="description" />
          </label>
          <SubmitButton>Crear</SubmitButton>
        </form>
      </div>
      <div className="card">
        {(data ?? []).length === 0 ? (
          <p className="muted mb0">Aún no tienes presets.</p>
        ) : (
          <ul className="list">
            {(data ?? []).map((p: Row) => (
              <li key={p.id}>
                <Link href={`/coach/presets/${p.id}`} className="list-link">
                  <div>
                    <strong>{p.name}</strong>
                    <div className="muted small">{p.description ?? ''}</div>
                  </div>
                  <span className="badge">{(p.preset_days ?? []).length} días</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
