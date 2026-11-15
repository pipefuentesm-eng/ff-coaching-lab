import Link from 'next/link';
import { athleteContext } from '@/lib/auth';
import { signOut } from '../../auth-actions';

export default async function MorePage() {
  const { athlete, viewing } = await athleteContext();
  return (
    <>
      <h1>Más</h1>
      <div className="card">
        <ul className="list">
          <li>
            <Link href="/athlete/gasto" className="list-link">
              <span>🔥 Gasto calórico (pasos y cardio)</span>
              <span className="muted">›</span>
            </Link>
          </li>
          <li>
            <Link href="/athlete/suplementacion" className="list-link">
              <span>💊 Suplementación</span>
              <span className="muted">›</span>
            </Link>
          </li>
          <li>
            <Link href="/athlete/accesorios" className="list-link">
              <span>🎒 Accesorios</span>
              <span className="muted">›</span>
            </Link>
          </li>
        </ul>
      </div>
      <div className="card soft">
        <div className="muted small">Sesión de</div>
        <strong>{athlete.full_name}</strong>
        {!viewing && (
          <form action={signOut} className="mt">
            <button className="btn btn-block">Cerrar sesión</button>
          </form>
        )}
      </div>
      <p className="muted tiny center">
        Consejo: en el celular, usa “Compartir → Agregar a inicio” para tener la app como ícono.
      </p>
    </>
  );
}
