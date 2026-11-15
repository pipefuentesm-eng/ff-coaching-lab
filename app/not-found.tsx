export default function NotFound() {
  return (
    <main className="container narrow">
      <div className="card">
        <h1>No encontrado</h1>
        <p className="muted">La página no existe o no tienes acceso.</p>
        <a className="btn btn-primary" href="/">
          Ir al inicio
        </a>
      </div>
    </main>
  );
}
