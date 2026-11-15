import Link from 'next/link';
import { athleteContext } from '@/lib/auth';
import SubmitButton from '@/components/SubmitButton';
import type { Row } from '@/lib/utils';
import { toggleAccessory } from '../actions';

export default async function AccesoriosPage() {
  const { supabase, athleteId, canWrite } = await athleteContext();
  const [{ data: accs }, { data: checks }] = await Promise.all([
    supabase.from('accessories').select('*').eq('athlete_id', athleteId).order('position'),
    supabase.from('accessory_checks').select('accessory_id').eq('athlete_id', athleteId),
  ]);
  const has = new Set((checks ?? []).map((c: Row) => c.accessory_id));

  return (
    <>
      <Link href="/athlete/more" className="muted small">
        ← Más
      </Link>
      <h1 className="mt">Accesorios</h1>
      <div className="card">
        {(accs ?? []).length === 0 ? (
          <p className="muted mb0">Tu coach aún no te recomienda accesorios.</p>
        ) : (
          <ul className="list">
            {(accs ?? []).map((a: Row) => (
              <li key={a.id} className="row between">
                <div>
                  <strong>{a.name}</strong>
                  {a.note && <div className="muted small">{a.note}</div>}
                </div>
                {canWrite ? (
                  <form action={toggleAccessory}>
                    <input type="hidden" name="accessoryId" value={a.id} />
                    <input type="hidden" name="has" value={has.has(a.id) ? '1' : '0'} />
                    <SubmitButton className={`btn btn-sm ${has.has(a.id) ? 'btn-primary' : ''}`} pendingText="…">
                      {has.has(a.id) ? 'Lo tengo ✓' : 'Lo tengo'}
                    </SubmitButton>
                  </form>
                ) : (
                  <span className={`badge ${has.has(a.id) ? 'badge-ok' : ''}`}>{has.has(a.id) ? 'Lo tiene ✓' : 'Aún no'}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
