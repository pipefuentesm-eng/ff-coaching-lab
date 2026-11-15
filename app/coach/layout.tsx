import Link from 'next/link';
import { requireCoach } from '@/lib/auth';
import { signOut } from '../auth-actions';

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireCoach();
  return (
    <>
      <header className="topnav">
        <div className="inner">
          <Link href="/coach/athletes" className="brand">
            FF <span>Coaching Lab</span>
          </Link>
          <Link href="/coach/athletes">Mis atletas</Link>
          <Link href="/coach/presets">Presets</Link>
          <Link href="/coach/exercises">Ejercicios</Link>
          <Link href="/coach/nutrition-foods">Alimentos</Link>
          <Link href="/coach/checkin-fields">Check-in</Link>
          <span className="spacer" />
          <span className="small" style={{ color: '#b7bac2' }}>
            {profile.full_name}
          </span>
          <form action={signOut}>
            <button className="btn btn-sm">Salir</button>
          </form>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
