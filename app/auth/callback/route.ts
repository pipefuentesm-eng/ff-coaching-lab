import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Llega aquí desde el correo de confirmación.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get('code');
  url.search = '';
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }
  url.pathname = '/login';
  url.searchParams.set('ok', 'Correo confirmado. Ahora inicia sesión.');
  return NextResponse.redirect(url);
}
