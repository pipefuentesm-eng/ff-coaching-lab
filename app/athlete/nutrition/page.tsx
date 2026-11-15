import Link from 'next/link';
import { athleteContext } from '@/lib/auth';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { currentVersion, loadDiet } from '@/lib/diet';
import { loadPlan } from '@/lib/training';
import { fmtDate, weekdayOf } from '@/lib/dates';
import { kcalFromPCG, macrosOf, sumM, unitLabel, type Macros } from '@/lib/nutrition';
import { fmtNum, one, r0, r1, type Row } from '@/lib/utils';
import { addMacroLog, deleteMacroLog } from '../actions';

export default async function AthleteNutrition({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, athleteId, athlete, today, canWrite } = await athleteContext();

  // Hoy es día de entreno si la última semana del bloque tiene un día con el weekday de hoy
  let defaultType = 'descanso';
  const plan = await loadPlan(supabase, athleteId);
  const lastWeek = plan.weeks[plan.weeks.length - 1];
  if (lastWeek && (lastWeek.days as Row[]).some((d) => d.weekday === weekdayOf(today))) defaultType = 'entreno';
  const type = sp.type === 'entreno' || sp.type === 'descanso' ? (sp.type as string) : defaultType;
  const back = `/athlete/nutrition?type=${type}`;

  const version = await currentVersion(supabase, athleteId, type, today);
  const tree = version ? await loadDiet(supabase, version) : null;
  const water = athlete.water_goal_l ? Number(athlete.water_goal_l) : 3;

  const [{ data: logs }, { data: foods }] = await Promise.all([
    supabase.from('macro_logs').select('*, foods(*)').eq('athlete_id', athleteId).eq('log_date', today).order('created_at'),
    supabase.from('foods').select('id,name,unit').eq('coach_id', athlete.coach_id).order('name'),
  ]);
  const logMacros = (l: Row): Macros => {
    const f = one(l.foods);
    if (f && l.amount) return macrosOf(f, Number(l.amount));
    const p = Number(l.protein ?? 0), c = Number(l.carbs ?? 0), g = Number(l.fat ?? 0);
    return { kcal: kcalFromPCG(p, c, g), p, c, f: g };
  };

  return (
    <>
      <Flash sp={sp} />
      <h1>Nutrición</h1>
      <div className="tabs">
        <Link href="/athlete/nutrition?type=entreno" className={`tab ${type === 'entreno' ? 'active' : ''}`}>
          Día de entreno
        </Link>
        <Link href="/athlete/nutrition?type=descanso" className={`tab ${type === 'descanso' ? 'active' : ''}`}>
          Día de descanso
        </Link>
      </div>

      {!tree ? (
        <div className="card">
          <p className="mb0">Tu coach aún no publica tu pauta para este tipo de día.</p>
        </div>
      ) : (
        <>
          <div className="card dark">
            <div className="label">Metas del día</div>
            <div className="kpis mt">
              <div className="kpi">
                <b>{r0(tree.goals.kcal)}</b>
                <span>kcal</span>
              </div>
              <div className="kpi">
                <b>{r0(tree.goals.p)}</b>
                <span>Prot</span>
              </div>
              <div className="kpi">
                <b>{r0(tree.goals.c)}</b>
                <span>Carb</span>
              </div>
              <div className="kpi">
                <b>{r0(tree.goals.f)}</b>
                <span>Grasa</span>
              </div>
              <div className="kpi">
                <b>{fmtNum(water)}</b>
                <span>Agua L</span>
              </div>
            </div>
            <div className="muted tiny mt">Pauta vigente desde {fmtDate(version!.valid_from)}</div>
          </div>
          {(version!.plan_notes as Row)?.text && (
            <div className="card soft small" style={{ whiteSpace: 'pre-wrap' }}>
              {(version!.plan_notes as Row).text}
            </div>
          )}

          {tree.meals.map((m) => {
            const mealLogs = (logs ?? []).filter((l: Row) => l.meal_id === m.id);
            const eaten = sumM(mealLogs.map(logMacros));
            return (
              <div className="card" key={m.id}>
                <div className="row between">
                  <h2 className="mb0">{m.name}</h2>
                  <span className="muted small">{r0(m.goal.kcal)} kcal</span>
                </div>
                {(m.diet_options as Row[]).map((o) => (
                  <div className="meal-opt" key={o.id}>
                    {(m.diet_options as Row[]).length > 1 && (
                      <div className="row between">
                        <strong className="small">Opción {o.option_number}</strong>
                        <span className="muted tiny">
                          {r0(o.totals.kcal)} kcal · P {r1(o.totals.p)} · C {r1(o.totals.c)} · G {r1(o.totals.f)}
                        </span>
                      </div>
                    )}
                    {(o.diet_items as Row[]).map((it) => (
                      <div key={it.id}>
                        <div className="item-line">
                          <span>
                            <strong>
                              {fmtNum(it.amount)} {unitLabel(it.food)}
                            </strong>{' '}
                            {it.food?.name ?? it.label}
                            {it.note && <span className="muted small"> · {it.note}</span>}
                          </span>
                          <span className="muted tiny nowrap">
                            P{r0(it.macros.p)} C{r0(it.macros.c)} G{r0(it.macros.f)}
                          </span>
                        </div>
                        {(it.diet_equivalences as Row[]).length > 0 && (
                          <details className="equiv">
                            <summary className="muted" style={{ fontWeight: 500 }}>
                              ↔ {(it.diet_equivalences as Row[]).length} equivalencias
                            </summary>
                            {(it.diet_equivalences as Row[]).map((q) => (
                              <div key={q.id}>
                                {fmtNum(q.amount)} {unitLabel(q.food)} {q.food?.name ?? q.label} · {fmtNum(q.kcal)} kcal
                              </div>
                            ))}
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                <details className="box">
                  <summary>🔄 Cambiar a macros (trackear libre)</summary>
                  <div className="small mt">
                    Meta de esta comida: <strong>{r0(m.goal.kcal)} kcal</strong> · P {r0(m.goal.p)} · C {r0(m.goal.c)} · G {r0(m.goal.f)}
                    <br />
                    Llevas hoy: <strong>{r0(eaten.kcal)} kcal</strong> · P {r0(eaten.p)} · C {r0(eaten.c)} · G {r0(eaten.f)}
                  </div>
                  {mealLogs.map((l: Row) => {
                    const mm = logMacros(l);
                    const f = one(l.foods);
                    return (
                      <div className="item-line small" key={l.id}>
                        <span>
                          {f ? `${fmtNum(l.amount)} ${unitLabel(f)} ${f.name}` : l.label || 'Registro libre'} · {r0(mm.kcal)} kcal
                        </span>
                        {canWrite && (
                          <form action={deleteMacroLog}>
                            <input type="hidden" name="id" value={l.id} />
                            <input type="hidden" name="back" value={back} />
                            <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
                              ✕
                            </SubmitButton>
                          </form>
                        )}
                      </div>
                    );
                  })}
                  {canWrite && (
                    <>
                      <form action={addMacroLog} className="stack mt">
                        <input type="hidden" name="mealId" value={m.id} />
                        <input type="hidden" name="back" value={back} />
                        <div className="label">Anotar macros directo</div>
                        <div className="grid3">
                          <input name="protein" inputMode="decimal" placeholder="Prot g" />
                          <input name="carbs" inputMode="decimal" placeholder="Carb g" />
                          <input name="fat" inputMode="decimal" placeholder="Grasa g" />
                        </div>
                        <input name="label" placeholder="Nombre (opcional)" />
                        <SubmitButton className="btn btn-sm">Agregar</SubmitButton>
                      </form>
                      <form action={addMacroLog} className="stack mt">
                        <input type="hidden" name="mealId" value={m.id} />
                        <input type="hidden" name="back" value={back} />
                        <div className="label">O elegir un alimento</div>
                        <div className="grid2">
                          <select name="food_id" defaultValue="">
                            <option value="">— Alimento —</option>
                            {(foods ?? []).map((f: Row) => (
                              <option key={f.id} value={f.id}>
                                {f.name} ({f.unit === 'g' ? 'g' : 'u'})
                              </option>
                            ))}
                          </select>
                          <input name="amount" inputMode="decimal" placeholder="Cantidad" />
                        </div>
                        <SubmitButton className="btn btn-sm">Agregar</SubmitButton>
                      </form>
                    </>
                  )}
                </details>
              </div>
            );
          })}
          <p className="muted tiny center">Las equivalencias son intercambios por la misma cantidad de calorías.</p>
        </>
      )}
    </>
  );
}
