import { requireCoach } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { createFood, deleteFood, importFoodsCsv, updateFood } from '../actions';
import type { Row } from '@/lib/utils';

function FoodFields({ f }: { f?: Row }) {
  return (
    <>
      <label className="field" style={{ flex: '2 1 200px' }}>
        Nombre
        <input name="name" defaultValue={f?.name ?? ''} required className="input-sm" />
      </label>
      <label className="field">
        Unidad
        <select name="unit" defaultValue={f?.unit ?? 'g'} className="input-sm">
          <option value="g">por 100 g</option>
          <option value="u">por unidad</option>
        </select>
      </label>
      <label className="field">
        kcal
        <input name="kcal" inputMode="decimal" defaultValue={f?.kcal_per_unit ?? ''} required className="input-sm" />
      </label>
      <label className="field">
        Proteína
        <input name="protein" inputMode="decimal" defaultValue={f?.protein_per_unit ?? ''} className="input-sm" />
      </label>
      <label className="field">
        Carbos
        <input name="carbs" inputMode="decimal" defaultValue={f?.carbs_per_unit ?? ''} className="input-sm" />
      </label>
      <label className="field">
        Grasa
        <input name="fat" inputMode="decimal" defaultValue={f?.fat_per_unit ?? ''} className="input-sm" />
      </label>
    </>
  );
}

export default async function FoodsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireCoach();
  const { data } = await supabase.from('foods').select('*').eq('coach_id', user.id).order('name');
  const list = data ?? [];
  const back = '/coach/nutrition-foods';

  return (
    <>
      <Flash sp={sp} />
      <h1>Base de alimentos</h1>
      <p className="muted small">
        Unidad <strong>g</strong> = valores por 100 g. Unidad <strong>u</strong> = valores por unidad (1 huevo, 1 rebanada…).
      </p>
      <div className="card">
        <h2>Nuevo alimento</h2>
        <form action={createFood} className="inline-form">
          <input type="hidden" name="back" value={back} />
          <FoodFields />
          <SubmitButton>Crear</SubmitButton>
        </form>
      </div>

      <details className="box">
        <summary>Importar CSV</summary>
        <form action={importFoodsCsv} className="stack mt">
          <input type="hidden" name="back" value={back} />
          <p className="muted small mb0">
            Pega el contenido con columnas <code>name,unit,kcal,protein,carbs,fat</code>. Si el nombre ya existe, se actualiza.
          </p>
          <textarea name="csv" rows={8} placeholder={'name,unit,kcal,protein,carbs,fat\nArroz (pesado en crudo),g,343,6.6,77.9,0.6'} />
          <div className="row end">
            <SubmitButton pendingText="Importando…">Importar</SubmitButton>
          </div>
        </form>
      </details>

      <div className="card">
        <h2>{list.length} alimentos</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Alimento</th>
                <th>Unidad</th>
                <th>kcal</th>
                <th>P</th>
                <th>C</th>
                <th>G</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((f: Row) => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td>{f.unit === 'g' ? '100 g' : 'unidad'}</td>
                  <td>{f.kcal_per_unit}</td>
                  <td>{f.protein_per_unit}</td>
                  <td>{f.carbs_per_unit}</td>
                  <td>{f.fat_per_unit}</td>
                  <td>
                    <details>
                      <summary className="small">Editar</summary>
                      <form action={updateFood} className="inline-form mt" style={{ minWidth: 520 }}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="back" value={back} />
                        <FoodFields f={f} />
                        <SubmitButton className="btn btn-sm btn-primary">Guardar</SubmitButton>
                      </form>
                      <form action={deleteFood} className="mt">
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="back" value={back} />
                        <SubmitButton className="btn btn-sm btn-danger" confirm={`¿Borrar "${f.name}"? Las dietas que lo usan quedarán con ese ítem sin alimento.`}>
                          Borrar
                        </SubmitButton>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
