import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  redirect(p?.role === 'coach' ? '/coach/athletes' : '/athlete');
}
