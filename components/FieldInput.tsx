import type { Row } from '@/lib/utils';

/** Renderiza el input de una pregunta de check-in según su tipo. */
export default function FieldInput({ field, value, workouts = [] }: { field: Row; value: unknown; workouts?: string[] }) {
  const k = 'f_' + field.id;
  const v = (value ?? null) as Row | string | number | null;
  const o = (v && typeof v === 'object' ? v : {}) as Row;
  const opts: string[] = Array.isArray(field.options) ? field.options : [];
  const label = (
    <div className="strong" style={{ color: 'var(--ink)' }}>
      {field.label}
      {field.unit && !['scale_1_5', 'scale_1_10'].includes(field.field_type) ? <span className="muted"> ({field.unit})</span> : null}
      {field.help && <div className="muted small" style={{ fontWeight: 400 }}>{field.help}</div>}
    </div>
  );

  const yesNo = (name: string, cur: boolean | undefined) => (
    <select name={name} defaultValue={cur === undefined ? '' : cur ? 'si' : 'no'}>
      <option value="">—</option>
      <option value="si">Sí</option>
      <option value="no">No</option>
    </select>
  );

  let input: React.ReactNode;
  switch (field.field_type) {
    case 'number':
      input = <input name={k} inputMode="decimal" defaultValue={typeof v === 'number' ? v : ''} />;
      break;
    case 'time_of_day':
      input = <input name={k} type="time" defaultValue={typeof v === 'string' ? v : ''} />;
      break;
    case 'scale_1_5':
    case 'scale_1_10': {
      const max = field.field_type === 'scale_1_5' ? 5 : 10;
      input = (
        <div className="scale">
          {Array.from({ length: max }, (_, i) => i + 1).map((x) => (
            <label key={x}>
              <input type="radio" name={k} value={x} defaultChecked={Number(v) === x} />
              {x}
            </label>
          ))}
        </div>
      );
      break;
    }
    case 'enum':
      input = (
        <select name={k} defaultValue={typeof v === 'string' ? v : ''}>
          <option value="">—</option>
          {opts.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      );
      break;
    case 'enum_detail':
      input = (
        <div className="grid2">
          <select name={k} defaultValue={o.choice ?? ''}>
            <option value="">—</option>
            {opts.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input name={k + '__detail'} placeholder="Detalle" defaultValue={o.detail ?? ''} />
        </div>
      );
      break;
    case 'boolean_detail':
      input = (
        <div className="grid2">
          {yesNo(k, o.yes)}
          <input name={k + '__detail'} placeholder="Detalle (opcional)" defaultValue={o.detail ?? ''} />
        </div>
      );
      break;
    case 'long_text':
      input = <textarea name={k} rows={3} defaultValue={typeof v === 'string' ? v : ''} />;
      break;
    case 'macros':
      input = (
        <div className="grid3">
          <input name={k + '__p'} inputMode="decimal" placeholder="Prot g" defaultValue={o.p ?? ''} />
          <input name={k + '__c'} inputMode="decimal" placeholder="Carb g" defaultValue={o.c ?? ''} />
          <input name={k + '__g'} inputMode="decimal" placeholder="Grasa g" defaultValue={o.g ?? ''} />
        </div>
      );
      break;
    case 'cardio':
      input = (
        <div className="grid2">
          <input name={k + '__type'} placeholder="Tipo (caminata, bici…)" defaultValue={o.type ?? ''} />
          <input name={k + '__min'} inputMode="numeric" placeholder="Minutos" defaultValue={o.min ?? ''} />
        </div>
      );
      break;
    case 'workout_select':
      input = (
        <select name={k} defaultValue={typeof v === 'string' ? v : ''}>
          <option value="">—</option>
          {workouts.map((w) => (
            <option key={w}>{w}</option>
          ))}
          <option>Descanso</option>
          <option>Otro entrenamiento</option>
        </select>
      );
      break;
    case 'time_duration':
      input = (
        <div className="grid2">
          <input name={k + '__h'} inputMode="numeric" placeholder="Horas" defaultValue={o.h ?? ''} />
          <input name={k + '__m'} inputMode="numeric" placeholder="Minutos" defaultValue={o.m ?? ''} />
        </div>
      );
      break;
    case 'nap_detail':
      input = (
        <div className="grid2">
          {yesNo(k, o.yes)}
          <input name={k + '__min'} inputMode="numeric" placeholder="Minutos" defaultValue={o.min ?? ''} />
        </div>
      );
      break;
    default:
      input = <input name={k} defaultValue={typeof v === 'string' ? v : ''} />;
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      {label}
      {input}
    </div>
  );
}
