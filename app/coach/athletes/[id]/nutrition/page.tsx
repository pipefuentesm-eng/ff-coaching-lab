import Link from 'next/link';
import { requireCoachOf } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import DietCsvImport from '@/components/DietCsvImport';
import { loadDiet } from '@/lib/diet';
import { dateCL, fmtDate, todayCL } from '@/lib/dates';
import { unitLabel, type Macros } from '@/lib/nutrition';
import { fmtNum, r0, r1, type Row } from '@/lib/utils';
import {
  addEquivalence,
  addItem,
  addMeal,
  addOption,
  copyDietTo,
  copyMeal,
  copyOption,
  createDiet,
  deleteDietVersion,
  deleteEquivalence,
  deleteItem,
  deleteMeal,
  deleteOption,
  importDietCsv,
  moveMeal,
  newDietVersion,
  renameMeal,
  savePlanNotes,
  updateItem,
} from '../../../nutrition-actions';

function Kpis({ m, water }: { m: Macros; water?: number }) {
  return (
    <div className={`kpis ${water === undefined ? 'four' : ''}`}>
      <div className="kpi">
        <b>{r0(m.kcal)}</b>
        <span>kcal</span>
      </div>
      <div className="kpi">
        <b>{r0(m.p)}</b>
        <span>Prot (g)</span>
      </div>
      <div className="kpi">
        <b>{r0(m.c)}</b>
        <span>Carb (g)</span>
      </div>
      <div className="kpi">
        <b>{r0(m.f)}</b>
        <span>Grasa (g)</span>
      </div>
      {water !== undefined && (
        <div className="kpi">
          <b>{fmtNum(water)}</b>
          <span>Agua (L)</span>
        </div>
      )}
    </div>
  );
}

function FoodSelect({ foods, name = 'food_id' }: { foods: Row[]; name?: string }) {
  return (
    <select name={name} defaultValue="" className="input-sm">
      <option value="">— Alimento —</option>
      {foods.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name} ({f.unit === 'g' ? 'g' : 'u'})
        </option>
      ))}
    </select>
  );
}

const Hidden = ({ v }: { v: Record<string, string> }) => (
  <>
    {Object.entries(v).map(([k, val]) => (
      <input key={k} type="hidden" name={k} value={val} />
    ))}
  </>
);

export default async function NutritionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, athlete } = await requireCoachOf(id);
  const type = sp.type === 'descanso' ? 'descanso' : 'entreno';
  const today = todayCL();
  const back = `/coach/athletes/${id}/nutrition?type=${type}`;

  const [{ data: versions }, { data: foods }] = await Promise.all([
    supabase.from('diet_versions').select('*').eq('athlete_id', id).eq('day_type', type).order('valid_from', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('foods').select('*').eq('coach_id', user.id).order('name'),
  ]);
  const list: Row[] = versions ?? [];
  const latest = list[0];
  const vigente = list.find((v) => v.valid_from <= today);
  const editable = !!latest && (latest.valid_from > today || dateCL(latest.created_at) === today);
  const tree = latest ? await loadDiet(supabase, latest) : null;
  const water = athlete.water_goal_l ? Number(athlete.water_goal_l) : 3;
  const V: Record<string, string> = { versionId: latest?.id ?? '', back };

  return (
    <>
      <Flash sp={sp} />
      <Link href={`/coach/athletes/${id}`} className="muted small">
        ← {athlete.full_name}
      </Link>
      <h1 className="mt">Nutrición · {athlete.full_name}</h1>

      <div className="tabs">
        <Link href={`/coach/athletes/${id}/nutrition?type=entreno`} className={`tab ${type === 'entreno' ? 'active' : ''}`}>
          Día de entreno
        </Link>
        <Link href={`/coach/athletes/${id}/nutrition?type=descanso`} className={`tab ${type === 'descanso' ? 'active' : ''}`}>
          Día de descanso
        </Link>
      </div>

      {!latest || !tree ? (
        <div className="card">
          <p>Este alumno aún no tiene dieta de {type}.</p>
          <form action={createDiet}>
            <Hidden v={{ athleteId: id, day_type: type, back }} />
            <SubmitButton>Crear dieta de {type} (vigente desde hoy)</SubmitButton>
          </form>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="label">{latest.valid_from > today ? 'Versión programada' : 'Versión vigente'}</div>
                <strong>Desde {fmtDate(latest.valid_from)}</strong>
                {latest.valid_from > today && vigente && (
                  <div className="muted small">Hasta entonces el alumno ve la versión del {fmtDate(vigente.valid_from)}.</div>
                )}
              </div>
              <div className="row">
                {!editable && (
                  <form action={newDietVersion}>
                    <Hidden v={{ versionId: latest.id, day_type: type, back }} />
                    <SubmitButton className="btn btn-primary btn-sm">Crear nueva versión para editar (desde mañana)</SubmitButton>
                  </form>
                )}
                <form action={copyDietTo}>
                  <Hidden v={{ versionId: latest.id, athleteId: id, target: type === 'entreno' ? 'descanso' : 'entreno', back }} />
                  <SubmitButton className="btn btn-sm" confirm="Se creará una copia completa en el otro tipo de día. ¿Continuar?">
                    Copiar dieta a {type === 'entreno' ? 'Descanso' : 'Entreno'}
                  </SubmitButton>
                </form>
                {latest.valid_from > today && (
                  <form action={deleteDietVersion}>
                    <Hidden v={{ versionId: latest.id, back }} />
                    <SubmitButton className="btn btn-sm btn-danger" confirm="¿Descartar esta versión programada?">
                      Descartar versión
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
            {!editable && (
              <div className="alert alert-info small">
                Esta versión ya está vigente. Para cambiarla, crea una nueva versión: el alumno verá los cambios desde mañana y el historial queda guardado.
              </div>
            )}
            <div className="label">Metas del día (suma de la Opción 1 de cada comida)</div>
            <div className="mt">
              <Kpis m={tree.goals} water={water} />
            </div>
            <form action={savePlanNotes} className="stack mt">
              <Hidden v={{ versionId: latest.id, back }} />
              <label className="field">
                Indicaciones generales para el alumno
                <textarea name="notes" rows={2} defaultValue={(latest.plan_notes as Row)?.text ?? ''} />
              </label>
              <div className="row end">
                <SubmitButton className="btn btn-sm">Guardar indicaciones</SubmitButton>
              </div>
            </form>
          </div>

          {tree.meals.map((m, mi) => (
            <div className="card" key={m.id}>
              <div className="card-head">
                {editable ? (
                  <form action={renameMeal} className="inline-form" style={{ flex: 1 }}>
                    <Hidden v={{ mealId: m.id, back }} />
                    <input name="name" defaultValue={m.name} className="input-sm" style={{ fontWeight: 700 }} />
                    <SubmitButton className="btn btn-sm">Renombrar</SubmitButton>
                  </form>
                ) : (
                  <h2>{m.name}</h2>
                )}
                {editable && (
                  <div className="row">
                    {mi > 0 && (
                      <form action={moveMeal}>
                        <Hidden v={{ ...V, mealId: m.id, dir: 'up' }} />
                        <SubmitButton className="btn btn-sm" pendingText="…">
                          ↑
                        </SubmitButton>
                      </form>
                    )}
                    {mi < tree.meals.length - 1 && (
                      <form action={moveMeal}>
                        <Hidden v={{ ...V, mealId: m.id, dir: 'down' }} />
                        <SubmitButton className="btn btn-sm" pendingText="…">
                          ↓
                        </SubmitButton>
                      </form>
                    )}
                    <form action={copyMeal}>
                      <Hidden v={{ ...V, mealId: m.id }} />
                      <SubmitButton className="btn btn-sm">Copiar comida</SubmitButton>
                    </form>
                    <form action={deleteMeal}>
                      <Hidden v={{ mealId: m.id, back }} />
                      <SubmitButton className="btn btn-sm btn-danger" confirm={`¿Eliminar "${m.name}"?`}>
                        Eliminar
                      </SubmitButton>
                    </form>
                  </div>
                )}
              </div>

              {(m.diet_options as Row[]).map((o) => (
                <div className="meal-opt" key={o.id}>
                  <div className="row between">
                    <strong>Opción {o.option_number}</strong>
                    <span className="small muted">
                      {r0(o.totals.kcal)} kcal · P {r1(o.totals.p)} · C {r1(o.totals.c)} · G {r1(o.totals.f)}
                    </span>
                  </div>
                  {(o.diet_items as Row[]).map((it) => (
                    <div key={it.id}>
                      <div className="item-line">
                        <span>
                          <strong>
                            {fmtNum(it.amount)} {unitLabel(it.food)}
                          </strong>{' '}
                          {it.food?.name ?? it.label ?? '(alimento borrado)'}
                          {it.note && <span className="muted small"> · {it.note}</span>}
                        </span>
                        <span className="muted small nowrap">
                          {r0(it.macros.kcal)} kcal · P{r0(it.macros.p)} C{r0(it.macros.c)} G{r0(it.macros.f)}
                        </span>
                      </div>
                      {(it.diet_equivalences as Row[]).map((q) => (
                        <div className="equiv row" key={q.id}>
                          ↔ {q.food?.name ?? q.label} · {fmtNum(q.amount)} {unitLabel(q.food)} · {fmtNum(q.kcal)} kcal
                          {editable && (
                            <form action={deleteEquivalence} className="inline">
                              <Hidden v={{ eqId: q.id, back }} />
                              <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
                                ✕
                              </SubmitButton>
                            </form>
                          )}
                        </div>
                      ))}
                      {editable && (
                        <details className="small" style={{ marginLeft: 12 }}>
                          <summary className="muted">editar · equivalencias</summary>
                          <div className="row mt">
                            <form action={updateItem} className="inline-form">
                              <Hidden v={{ itemId: it.id, back }} />
                              <label className="field">
                                Cantidad
                                <input name="amount" defaultValue={it.amount} inputMode="decimal" className="input-sm" />
                              </label>
                              <label className="field">
                                Nota
                                <input name="note" defaultValue={it.note ?? ''} className="input-sm" />
                              </label>
                              <SubmitButton className="btn btn-sm">Guardar</SubmitButton>
                            </form>
                            <form action={deleteItem}>
                              <Hidden v={{ itemId: it.id, back }} />
                              <SubmitButton className="btn btn-sm btn-danger" pendingText="…">
                                Quitar
                              </SubmitButton>
                            </form>
                          </div>
                          <form action={addEquivalence} className="inline-form mt">
                            <Hidden v={{ itemId: it.id, back }} />
                            <label className="field">
                              Equivalente
                              <FoodSelect foods={foods ?? []} />
                            </label>
                            <label className="field">
                              Igualar
                              <select name="mode" defaultValue="kcal" className="input-sm">
                                <option value="kcal">Calorías</option>
                                <option value="carbs">Carbohidratos</option>
                              </select>
                            </label>
                            <label className="field">
                              Cantidad (vacío = automática)
                              <input name="amount" inputMode="decimal" className="input-sm" />
                            </label>
                            <label className="field check">
                              <input type="checkbox" name="round5" defaultChecked /> de 5 en 5 g
                            </label>
                            <SubmitButton className="btn btn-sm btn-primary">+ Equivalencia</SubmitButton>
                          </form>
                        </details>
                      )}
                    </div>
                  ))}
                  {editable && (
                    <>
                      <form action={addItem} className="inline-form mt">
                        <Hidden v={{ optionId: o.id, back }} />
                        <label className="field" style={{ flex: '2 1 200px' }}>
                          Alimento
                          <FoodSelect foods={foods ?? []} />
                        </label>
                        <label className="field">
                          Cantidad
                          <input name="amount" inputMode="decimal" className="input-sm" required />
                        </label>
                        <label className="field">
                          Nota
                          <input name="note" className="input-sm" />
                        </label>
                        <SubmitButton className="btn btn-sm btn-primary">+ Ítem</SubmitButton>
                      </form>
                      <div className="row mt">
                        <form action={copyOption}>
                          <Hidden v={{ optionId: o.id, mealId: m.id, back }} />
                          <SubmitButton className="btn btn-sm">Copiar opción</SubmitButton>
                        </form>
                        <form action={deleteOption}>
                          <Hidden v={{ optionId: o.id, back }} />
                          <SubmitButton className="btn btn-sm btn-danger" confirm={`¿Eliminar la opción ${o.option_number}?`}>
                            Eliminar opción
                          </SubmitButton>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {editable && (
                <form action={addOption} className="mt">
                  <Hidden v={{ mealId: m.id, back }} />
                  <SubmitButton className="btn btn-sm">+ Opción vacía</SubmitButton>
                </form>
              )}
            </div>
          ))}

          {editable && (
            <>
              <div className="card soft">
                <form action={addMeal} className="inline-form">
                  <Hidden v={{ versionId: latest.id, back }} />
                  <label className="field">
                    Nueva comida
                    <input name="name" placeholder={`Comida ${tree.meals.length + 1} · …`} />
                  </label>
                  <SubmitButton>+ Comida</SubmitButton>
                </form>
              </div>
              <details className="box">
                <summary>Importar dieta desde CSV</summary>
                <DietCsvImport foods={foods ?? []} action={importDietCsv} versionId={latest.id} back={back} />
              </details>
            </>
          )}

          <div className="card soft small">
            <strong>Reglas de la pauta</strong>
            <ul className="muted" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              <li>Vegetales como base aparte (100 kcal/día).</li>
              <li>Carbohidratos pesados en crudo; la proteína puede ir en cocido.</li>
              <li>Porciones de carbohidrato iguales en kcal entre comidas.</li>
              <li>Grasas en porciones estándar.</li>
              <li>Las equivalencias se calculan para igualar las kcal del ítem (o los carbohidratos, si eliges esa opción).</li>
            </ul>
          </div>

          {list.length > 1 && (
            <details className="box">
              <summary>Historial de versiones ({list.length})</summary>
              <ul className="list">
                {list.map((v) => (
                  <li key={v.id} className="small">
                    Desde {fmtDate(v.valid_from)} {v.id === vigente?.id && <span className="badge badge-ok">vigente</span>}
                    {v.valid_from > today && <span className="badge badge-warn">programada</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </>
  );
}
