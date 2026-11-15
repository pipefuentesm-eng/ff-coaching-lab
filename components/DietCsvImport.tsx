'use client';
import { useMemo, useState } from 'react';
import { matchFood, parseDietRows } from '@/lib/foodmatch';
import { parseCsv, type Row } from '@/lib/utils';
import SubmitButton from './SubmitButton';

/** Importar dieta por CSV con previsualización de coincidencias antes de cargar. */
export default function DietCsvImport({
  foods,
  action,
  versionId,
  back,
}: {
  foods: Row[];
  action: (fd: FormData) => Promise<void>;
  versionId: string;
  back: string;
}) {
  const [text, setText] = useState('');
  const rows = useMemo(() => parseDietRows(parseCsv(text)), [text]);
  const matched = rows.map((r) => ({ ...r, food: matchFood(r.food, foods), raw: r.food }));
  const ok = matched.filter((r) => r.food && r.amount).length;

  return (
    <form action={action} className="stack mt">
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="back" value={back} />
      <p className="muted small mb0">
        Columnas: <code>Comida, Opción, Alimento, Cantidad</code> (cantidad en gramos o unidades, según el alimento).
      </p>
      <textarea
        name="csv"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Comida,Opción,Alimento,Cantidad\nComida 1 · Desayuno,1,Avena,60\nComida 1 · Desayuno,1,Whey isolate,30'}
      />
      {matched.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Comida</th>
                <th>Op.</th>
                <th>En el CSV</th>
                <th>Coincide con</th>
                <th>Cant.</th>
              </tr>
            </thead>
            <tbody>
              {matched.map((r) => (
                <tr key={r.line}>
                  <td>{r.meal}</td>
                  <td>{r.option}</td>
                  <td>{r.raw}</td>
                  <td>{r.food ? r.food.name : <span className="badge badge-danger">Sin coincidencia</span>}</td>
                  <td>{r.amount ?? <span className="badge badge-danger">?</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="row end">
        <span className="muted small">
          {ok} de {matched.length} filas se cargarán
        </span>
        <SubmitButton pendingText="Importando…">Cargar a la dieta</SubmitButton>
      </div>
    </form>
  );
}
