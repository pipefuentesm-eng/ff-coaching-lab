'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container narrow">
      <div className="card">
        <h1>Algo salió mal</h1>
        <p className="muted">
          No pudimos completar la acción. Vuelve a intentarlo; si se repite, copia este código y envíaselo a soporte:{' '}
          <code>{error.digest ?? error.message}</code>
        </p>
        <div className="row">
          <button className="btn btn-primary" onClick={() => reset()}>
            Reintentar
          </button>
          <a className="btn" href="/">
            Ir al inicio
          </a>
        </div>
      </div>
    </main>
  );
}
