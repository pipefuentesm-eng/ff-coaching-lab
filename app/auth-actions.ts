'use server';
import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { enc, str } from '@/lib/utils';
import { VIEW_AS_COOKIE } from '@/lib/auth';

function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Debes confirmar tu correo antes de entrar. Revisa tu bandeja (y spam).';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ese correo ya tiene cuenta. Inicia sesión.';
  if (m.includes('password should be') || m.includes('at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.';
  if (m.includes('invalid') && m.includes('email')) return 'El correo no es válido.';
  return msg;
}

export async function signIn(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(fd, 'email'), password: str(fd, 'password') });
  if (error) redirect('/login?error=' + enc(translate(error.message)));
  redirect('/');
}

export async function signUp(fd: FormData) {
  const slug = str(fd, 'coach_slug');
  const back = '/register' + (slug ? '?c=' + enc(slug) + '&' : '?');
  const supabase = await createClient();

  if (slug) {
    const { data: coachName } = await supabase.rpc('coach_name_by_slug', { p_slug: slug });
    if (!coachName) redirect(back + 'error=' + enc('El link de registro no es válido. Pídele uno nuevo a tu coach.'));
  }
  const password = str(fd, 'password');
  if (password.length < 6) redirect(back + 'error=' + enc('La contraseña debe tener al menos 6 caracteres.'));
  if (password !== str(fd, 'password2')) redirect(back + 'error=' + enc('Las contraseñas no coinciden.'));

  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const { data, error } = await supabase.auth.signUp({
    email: str(fd, 'email'),
    password,
    options: {
      emailRedirectTo: origin + '/auth/callback',
      data: {
        full_name: str(fd, 'full_name'),
        phone: str(fd, 'phone'),
        birth_date: str(fd, 'birth_date'),
        coach_slug: slug,
      },
    },
  });
  if (error) redirect(back + 'error=' + enc(translate(error.message)));
  if (data.session) redirect('/');
  redirect('/login?ok=' + enc('¡Cuenta creada! Revisa tu correo para confirmar y luego inicia sesión.'));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(VIEW_AS_COOKIE);
  redirect('/login');
}
