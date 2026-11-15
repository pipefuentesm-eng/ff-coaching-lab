import Link from 'next/link';
import { signIn } from '../auth-actions';
import SubmitButton from '@/components/SubmitButton';
import Flash from '@/components/Flash';

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <main className="auth-wrap">
      <div className="card auth-card">
        <div className="brand">
          FF <span>Coaching Lab</span>
        </div>
        <h1>Iniciar sesión</h1>
        <Flash sp={sp} />
        <form action={signIn} className="stack">
          <label className="field">
            Correo
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="field">
            Contraseña
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <SubmitButton pendingText="Entrando…">Entrar</SubmitButton>
        </form>
        <p className="muted small">
          ¿No tienes cuenta? Pídele a tu coach tu link de registro. <Link href="/register">Registro</Link>
        </p>
      </div>
    </main>
  );
}
