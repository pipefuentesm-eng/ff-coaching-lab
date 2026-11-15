/** Muestra ?error= o ?ok= de la URL. */
export default function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const error = typeof sp.error === 'string' ? sp.error : null;
  const ok = typeof sp.ok === 'string' ? sp.ok : null;
  if (!error && !ok) return null;
  return <div className={error ? 'alert alert-error' : 'alert alert-ok'}>{error ?? ok}</div>;
}
