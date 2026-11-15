import Link from 'next/link';
import { headers } from 'next/headers';
import { requireCoach } from '@/lib/auth';
import CopyButton from '@/components/CopyButton';
import Flash from '@/components/Flash';
import { fmtDate, todayCL } from '@/lib/dates';
import type { Row } from '@/lib/utils';

export default async function AthletesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireCoach();
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const link = `${origin}/register?c=${profile.coach_slug ?? ''}`;

  const { data: athletes } = await supabase.from('profiles').select('*').eq('coach_id', user.id).order('full_name');
  const ids = (athletes ?? []).map((a: Row) => a.id);
  const { data: pending } = ids.length
    ? await supabase.from('checkins').select('athlete_id').in('athlete_id', ids).eq('status', 'submitted')
    : { data: [] as Row[] };
  const { data: blocks } = ids.length
    ? await supabase.from('training_blocks').select('athlete_id,name').in('athlete_id', ids).eq('status', 'active')
    : { data: [] as Row[] };
  const pendingSet = new Set((pending ?? []).map((p: Row) => p.athlete_id));
  const blockBy = new Map((blocks ?? []).map((b: Row) => [b.athlete_id, b.name]));
  const today = todayCL();

  const active = (athletes ?? []).filter((a: Row) => a.active);
  const inactive = (athletes ?? []).filter((a: Row) => !a.active);

  return (
    <>
      <Flash sp={sp} />
      <div className="card-head">
        <h1>Mis atletas</h1>
        <span className="badge">{active.length} activos</span>
      </div>

      <div className="card soft">
        <div className="label">Link de alta de alumnos</div>
        <div className="row mt">
          <code style={{ flex: 1, wordBreak: 'break-all' }}>{link}</code>
          <CopyButton text={link} label="Copiar link" />
        </div>
        <p className="muted small mt mb0">Envía este link a cada alumno nuevo: al registrarse queda asignado a ti automáticamente.</p>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <Link className="btn" href="/coach/presets">
          📋 Programas preset
        </Link>
        <Link className="btn" href="/coach/exercises">
          🏋️ Biblioteca de ejercicios
        </Link>
        <Link className="btn" href="/coach/nutrition-foods">
          🥗 Base de alimentos
        </Link>
        <Link className="btn" href="/coach/checkin-fields">
          ✅ Campos de check-in
        </Link>
      </div>

      <div className="card">
        {active.length === 0 ? (
          <p className="muted mb0">Aún no tienes alumnos. Comparte tu link de alta para que se registren.</p>
        ) : (
          <ul className="list">
            {active.map((a: Row) => (
              <li key={a.id}>
                <Link href={`/coach/athletes/${a.id}`} className="list-link">
                  <div>
                    <strong>{a.full_name}</strong>
                    <div className="muted small">
                      {blockBy.get(a.id) ? `Bloque: ${blockBy.get(a.id)}` : 'Sin bloque activo'}
                      {a.access_from && today < a.access_from ? ` · parte el ${fmtDate(a.access_from)}` : ''}
                    </div>
                  </div>
                  <div className="row">
                    {pendingSet.has(a.id) && <span className="badge badge-accent">Check-in listo para revisar</span>}
                    <span className="muted">›</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {inactive.length > 0 && (
        <details className="box">
          <summary>Inactivos ({inactive.length})</summary>
          <ul className="list">
            {inactive.map((a: Row) => (
              <li key={a.id}>
                <Link href={`/coach/athletes/${a.id}`} className="list-link">
                  <span className="muted">{a.full_name}</span>
                  <span className="badge">Inactivo</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
