import Link from 'next/link';
import { signUp } from '../auth-actions';
import SubmitButton from '@/components/SubmitButton';
import Flash from '@/components/Flash';
import { createClient } from '@/lib/supabase/server';

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const slug = typeof sp.c === 'string' ? sp.c : '';
  let coachName: string | null = null;
  if (slug) {
    const supabase = await createClient();
    const { data } = await supabase.rpc('coach_name_by_slug', { p_slug: slug });
    coachName = (data as string | null) ?? null;
  }

  return (
    <main className="auth-wrap">
      <div className="card auth-card">
        <div className="brand">
          FF <span>Coaching Lab</span>
        </div>
        <h1>Crear cuenta</h1>
        <Flash sp={sp} />
        {slug && !coachName ? (
          <div className="alert alert-error">
            Este link de registro no es válido. Pídele a tu coach el link correcto.
          </div>
        ) : (
          <>
            {coachName ? (
              <p className="muted">
                Te vas a registrar como alumno de <strong>{coachName}</strong>.
              </p>
            ) : (
              <p className="muted small">
                Si eres alumno, usa el link que te envió tu coach (así quedas asignado a él).
              </p>
            )}
            <form action={signUp} className="stack">
              <input type="hidden" name="coach_slug" value={slug} />
              <label className="field">
                Nombre completo
                <input name="full_name" required />
              </label>
              <label className="field">
                Correo
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <div className="grid2">
                <label className="field">
                  Teléfono
                  <input name="phone" type="tel" placeholder="+56 9 …" />
                </label>
                <label className="field">
                  Fecha de nacimiento
                  <input name="birth_date" type="date" />
                </label>
              </div>
              <label className="field">
                Contraseña (mínimo 6 caracteres)
                <input name="password" type="password" required minLength={6} autoComplete="new-password" />
              </label>
              <label className="field">
                Repite la contraseña
                <input name="password2" type="password" required minLength={6} autoComplete="new-password" />
              </label>
              <SubmitButton pendingText="Creando…">Crear cuenta</SubmitButton>
              <p className="muted small">Si se te pide confirmar el correo, revisa tu bandeja de entrada (y spam).</p>
            </form>
          </>
        )}
        <p className="muted small">
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}
