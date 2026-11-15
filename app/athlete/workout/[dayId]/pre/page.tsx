import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { athleteContext } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { skipDay, startSession } from '../../../actions';

function Scale({ name, max = 5 }: { name: string; max?: number }) {
  return (
    <div className="scale">
      {Array.from({ length: max }, (_, i) => i + 1).map((x) => (
        <label key={x}>
          <input type="radio" name={name} value={x} />
          {x}
        </label>
      ))}
    </div>
  );
}

export default async function PrePage({
  params,
  searchParams,
}: {
  params: Promise<{ dayId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { dayId } = await params;
  const sp = await searchParams;
  const { supabase, athleteId, canWrite } = await athleteContext();
  const { data: day } = await supabase.from('training_days').select('*').eq('id', dayId).maybeSingle();
  if (!day) notFound();
  const { data: s } = await supabase.from('workout_sessions').select('id').eq('athlete_id', athleteId).eq('day_id', dayId).maybeSingle();
  if (s || !canWrite) redirect(`/athlete/workout/${dayId}`);

  return (
    <>
      <Flash sp={sp} />
      <Link href="/athlete" className="muted small">
        ← Volver
      </Link>
      <h1 className="mt">Antes de entrenar · {day.name}</h1>
      <form action={startSession} className="card stack">
        <input type="hidden" name="dayId" value={dayId} />
        <label className="field">
          ¿Cuántas horas dormiste?
          <input name="sleep_h" inputMode="decimal" placeholder="7,5" />
        </label>
        <div className="field">
          Calidad del sueño (1 = mala · 5 = excelente)
          <Scale name="sleep_q" />
        </div>
        <div className="field">
          Energía (1–5)
          <Scale name="energy" />
        </div>
        <div className="field">
          Estrés (1–5)
          <Scale name="stress" />
        </div>
        <label className="field">
          ¿Algún dolor o molestia?
          <input name="pain" placeholder="Ej: hombro derecho al empujar" />
        </label>
        <label className="field">
          Nota
          <input name="note" />
        </label>
        <SubmitButton className="btn btn-primary btn-lg btn-block" pendingText="Comenzando…">
          Comenzar entrenamiento →
        </SubmitButton>
      </form>
      <form action={skipDay} className="center">
        <input type="hidden" name="dayId" value={dayId} />
        <SubmitButton className="btn btn-ghost btn-sm" confirm="¿Saltar este entrenamiento?">
          Saltar este entrenamiento
        </SubmitButton>
      </form>
    </>
  );
}
