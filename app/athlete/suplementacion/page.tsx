import Link from 'next/link';
import { athleteContext } from '@/lib/auth';
import type { Row } from '@/lib/utils';

export default async function SuplementacionPage() {
  const { supabase, athleteId } = await athleteContext();
  const { data } = await supabase.from('supplements').select('*').eq('athlete_id', athleteId).order('position');
  const groups: [string, Row[]][] = [
    ['Requerida', (data ?? []).filter((s: Row) => s.kind === 'required')],
    ['Sugerida', (data ?? []).filter((s: Row) => s.kind === 'suggested')],
  ];

  return (
    <>
      <Link href="/athlete/more" className="muted small">
        ← Más
      </Link>
      <h1 className="mt">Suplementación</h1>
      {(data ?? []).length === 0 && (
        <div className="card">
          <p className="muted mb0">Tu coach aún no define tu suplementación.</p>
        </div>
      )}
      {groups.map(([title, list]) =>
        list.length === 0 ? null : (
          <div className="card" key={title}>
            <h2>{title}</h2>
            <ul className="list">
              {list.map((s) => (
                <li key={s.id}>
                  <strong>{s.name}</strong>
                  <div className="small">{[s.dose, s.timing].filter(Boolean).join(' · ')}</div>
                  {s.why && <div className="muted small">Por qué: {s.why}</div>}
                  {s.notes && <div className="muted small">📝 {s.notes}</div>}
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </>
  );
}
