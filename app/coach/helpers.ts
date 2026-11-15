import { redirect } from 'next/navigation';
import { enc, int, num, str, strOrNull, type Row } from '@/lib/utils';

/** Vuelve a la página indicada en el input oculto "back" (solo rutas /coach). */
export function backUrl(fd: FormData): string {
  const b = str(fd, 'back');
  return b.startsWith('/coach') ? b : '/coach/athletes';
}

function clean(url: string): string {
  const [path, query = ''] = url.split('?');
  const params = query.split('&').filter((p) => p && !p.startsWith('error=') && !p.startsWith('ok='));
  return params.length ? `${path}?${params.join('&')}` : path;
}

function withParam(url: string, key: string, msg: string): string {
  const c = clean(url);
  return c + (c.includes('?') ? '&' : '?') + key + '=' + enc(msg);
}

export function done(fd: FormData, ok?: string): never {
  const url = backUrl(fd);
  redirect(ok ? withParam(url, 'ok', ok) : clean(url));
}

export function fail(fd: FormData, msg: string): never {
  redirect(withParam(backUrl(fd), 'error', msg));
}

/** Si Supabase devolvió error, redirige con un mensaje claro. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function check(fd: FormData, error: any, msg = 'No se pudo guardar'): void {
  if (error) fail(fd, `${msg}: ${error.message ?? error}`);
}

/** Reordena una fila dentro de su padre (normaliza posiciones 0..n). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function moveRow(supabase: any, table: string, parentCol: string, parentId: string, id: string, dir: number) {
  const { data } = await supabase.from(table).select('id,position').eq(parentCol, parentId).order('position').order('id');
  const list: Row[] = data ?? [];
  const i = list.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  for (let k = 0; k < list.length; k++) {
    if (list[k].position !== k) await supabase.from(table).update({ position: k }).eq('id', list[k].id);
  }
}


export function exerciseFields(fd: FormData) {
  return {
    sets: int(fd, 'sets') ?? 3,
    reps_min: int(fd, 'reps_min'),
    reps_max: int(fd, 'reps_max'),
    rir: num(fd, 'rir'),
    rest_min_min: num(fd, 'rest_min_min'),
    rest_max_min: num(fd, 'rest_max_min'),
    rest_pause_reps: int(fd, 'rest_pause_reps') ?? 0,
    ar_set: strOrNull(fd, 'ar_set'),
    tempo: strOrNull(fd, 'tempo'),
    block_note: strOrNull(fd, 'block_note'),
  };
}

