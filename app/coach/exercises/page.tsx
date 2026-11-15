import { requireCoach } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { createExercise, deleteExercise, updateExercise } from '../actions';
import type { Row } from '@/lib/utils';

const GROUPS = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Pantorrillas', 'Abdomen', 'Antebrazo', 'Aductores', 'Cardio', 'Otro'];

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireCoach();
  const { data } = await supabase.from('exercises').select('*').eq('coach_id', user.id).order('muscle_group').order('name');
  const list = data ?? [];
  const groups = Array.from(new Set([...GROUPS, ...list.map((e: Row) => e.muscle_group)]));
  const back = '/coach/exercises';

  return (
    <>
      <Flash sp={sp} />
      <h1>Biblioteca de ejercicios</h1>
      <datalist id="groups">
        {groups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <div className="card">
        <h2>Nuevo ejercicio</h2>
        <form action={createExercise} className="inline-form">
          <input type="hidden" name="back" value={back} />
          <label className="field">
            Nombre
            <input name="name" required />
          </label>
          <label className="field">
            Grupo muscular
            <input name="muscle_group" list="groups" required />
          </label>
          <label className="field">
            Link de video (opcional)
            <input name="video_url" type="url" placeholder="https://…" />
          </label>
          <SubmitButton>Crear</SubmitButton>
        </form>
      </div>
      <div className="card">
        <h2>{list.length} ejercicios</h2>
        <ul className="list">
          {list.map((e: Row) => (
            <li key={e.id}>
              <details>
                <summary>
                  {e.name} <span className="badge">{e.muscle_group}</span>{' '}
                  {e.video_url && (
                    <a href={e.video_url} target="_blank" rel="noreferrer" className="small">
                      ▶ video
                    </a>
                  )}
                </summary>
                <div className="row mt">
                  <form action={updateExercise} className="inline-form" style={{ flex: 1 }}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="back" value={back} />
                    <label className="field">
                      Nombre
                      <input name="name" defaultValue={e.name} className="input-sm" />
                    </label>
                    <label className="field">
                      Grupo
                      <input name="muscle_group" list="groups" defaultValue={e.muscle_group} className="input-sm" />
                    </label>
                    <label className="field">
                      Video
                      <input name="video_url" defaultValue={e.video_url ?? ''} className="input-sm" />
                    </label>
                    <SubmitButton className="btn btn-sm btn-primary">Guardar</SubmitButton>
                  </form>
                  <form action={deleteExercise}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="back" value={back} />
                    <SubmitButton className="btn btn-sm btn-danger" confirm={`¿Borrar "${e.name}"?`}>
                      Borrar
                    </SubmitButton>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
