import Link from 'next/link';
import { athleteContext } from '@/lib/auth';
import { fmtDate } from '@/lib/dates';
import { exitViewAs } from './actions';

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const { viewing, athlete, locked } = await athleteContext();
  return (
    <>
      {viewing && (
        <>
          <div className="viewas-bar">
            <span>
              👁 Viendo como <strong>{athlete.full_name}</strong> · solo lectura
            </span>
            <form action={exitViewAs}>
              <input type="hidden" name="athleteId" value={athlete.id} />
              <button className="btn btn-sm">Salir</button>
            </form>
          </div>
          <div className="viewas-spacer" />
        </>
      )}
      {locked && (
        <div className="lock-banner">
          {viewing
            ? `Este alumno está bloqueado hasta el ${fmtDate(athlete.access_from)}: ve su plan pero aún no puede registrar.`
            : `🔒 Tu plan parte el ${fmtDate(athlete.access_from)}. Puedes revisarlo, pero aún no puedes registrar nada.`}
        </div>
      )}
      <main className="athlete-main">{children}</main>
      <nav className="bottom-nav">
        <Link href="/athlete">
          <span className="ico">🏋️</span>Entrenamiento
        </Link>
        <Link href="/athlete/nutrition">
          <span className="ico">🥗</span>Nutrición
        </Link>
        <Link href="/athlete/checkin">
          <span className="ico">✅</span>Check-in
        </Link>
        <Link href="/athlete/more">
          <span className="ico">⋯</span>Más
        </Link>
      </nav>
    </>
  );
}
