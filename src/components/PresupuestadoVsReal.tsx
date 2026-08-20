"use client";

import type { BudgetProjection } from "@/types";
import { catColors } from "@/lib/constants";

interface Props {
  projection: BudgetProjection;
}

/** "$1.234.567" — pesos nominales, formato es-AR */
const fmtArs = (n: number) =>
  "$" + Math.round(Math.abs(n)).toLocaleString("es-AR", { maximumFractionDigits: 0 });

/** "82%" */
const fmtPct = (n: number) => `${Math.round(n)}%`;

const GRID = "1fr 92px 108px 108px 108px";

export default function PresupuestadoVsReal({ projection }: Props) {
  const {
    byRubro,
    totalProjectedArs,
    totalExecutedArs,
    deviationArs,
    pctArs,
    unassignedArs,
    unassignedCount,
  } = projection;

  // Solo tienen sentido los rubros con presupuesto cargado en pesos.
  const conPresupuesto = byRubro.filter((r) => r.projectedArs > 0);
  const sinMonto = byRubro.filter((r) => r.projectedArs <= 0);

  return (
    <div>
      <div
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-faint)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Encabezado */}
        <div
          className="pvr-head-row"
          style={{
            display: "grid",
            gridTemplateColumns: GRID,
            alignItems: "center",
            gap: 14,
            padding: "13px 17px",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            color: "var(--text-tertiary)",
            fontWeight: 600,
            background: "var(--surface-2)",
          }}
        >
          <div>Rubro</div>
          <div className="tabular" style={{ textAlign: "right" }}>Pagado</div>
          <div className="tabular" style={{ textAlign: "right" }}>Presupuesto</div>
          <div className="tabular" style={{ textAlign: "right" }}>Pagado $</div>
          <div className="tabular" style={{ textAlign: "right" }}>Saldo</div>
        </div>

        {conPresupuesto.map((r) => {
          const pct = r.pctArs;
          const barra = Math.min(pct, 100);
          const excedido = r.executedArs > r.projectedArs;
          const color = excedido
            ? "var(--danger)"
            : pct >= 90
              ? "var(--warning)"
              : "var(--success)";
          const dotColor = catColors[r.category] || "var(--text-secondary)";

          return (
            <div
              key={r.partidaId}
              className="pvr-data-row"
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                alignItems: "center",
                gap: 14,
                padding: "13px 17px",
                borderBottom: "1px solid var(--border-faint)",
                fontSize: 13,
              }}
            >
              {/* Rubro + barra de avance pagado */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 500, color: "var(--text-primary)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: dotColor }} />
                  <span className="truncate">{r.name}</span>
                  {excedido && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--danger)",
                        background: "var(--danger-soft)",
                        border: "1px solid var(--danger-border)",
                        borderRadius: 5,
                        padding: "1px 6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      excedido
                    </span>
                  )}
                </div>
                <div style={{ height: 7, background: "var(--bg)", borderRadius: 6, overflow: "hidden", marginTop: 7 }}>
                  <div style={{ height: "100%", borderRadius: 6, width: `${barra}%`, background: color }} />
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-quaternary)", marginTop: 4 }}>
                  {r.costCount} {r.costCount === 1 ? "pago" : "pagos"} imputados
                </div>
              </div>

              {/* % pagado */}
              <div
                className="tabular"
                data-label="Pagado"
                style={{ textAlign: "right", fontWeight: 700, fontSize: 15, color }}
              >
                {fmtPct(pct)}
              </div>

              <div className="tabular" data-label="Presupuesto" style={{ textAlign: "right", fontWeight: 600, color: "var(--text-tertiary)" }}>
                {fmtArs(r.projectedArs)}
              </div>
              <div className="tabular" data-label="Pagado $" style={{ textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>
                {fmtArs(r.executedArs)}
              </div>
              <div
                className="tabular"
                data-label="Saldo"
                style={{
                  textAlign: "right",
                  fontWeight: 600,
                  color: r.deviationArs < 0 ? "var(--danger)" : "var(--text-secondary)",
                }}
              >
                {r.deviationArs < 0 ? `−${fmtArs(r.deviationArs)}` : fmtArs(r.deviationArs)}
              </div>
            </div>
          );
        })}

        {conPresupuesto.length === 0 && (
          <div style={{ padding: "26px 17px", textAlign: "center", fontSize: 13, color: "var(--text-tertiary)" }}>
            Todavía no hay presupuestos cargados en pesos.
          </div>
        )}

        {/* Total */}
        <div
          className="pvr-data-row"
          style={{
            display: "grid",
            gridTemplateColumns: GRID,
            gap: 14,
            padding: "15px 17px",
            background: "var(--surface-2)",
            borderTop: "1px solid var(--accent)",
            fontSize: 13.5,
            fontWeight: 700,
            alignItems: "center",
          }}
        >
          <div data-label="" style={{ color: "var(--text-primary)" }}>Total obra</div>
          <div
            className="tabular"
            data-label="Pagado"
            style={{
              textAlign: "right",
              fontSize: 15,
              color: totalExecutedArs > totalProjectedArs ? "var(--danger)" : "var(--text-primary)",
            }}
          >
            {totalProjectedArs > 0 ? fmtPct(pctArs) : "—"}
          </div>
          <div className="tabular" data-label="Presupuesto" style={{ textAlign: "right", color: "var(--text-primary)" }}>
            {fmtArs(totalProjectedArs)}
          </div>
          <div className="tabular" data-label="Pagado $" style={{ textAlign: "right", color: "var(--text-primary)" }}>
            {fmtArs(totalExecutedArs)}
          </div>
          <div
            className="tabular"
            data-label="Saldo"
            style={{ textAlign: "right", color: deviationArs < 0 ? "var(--danger)" : "var(--text-primary)" }}
          >
            {deviationArs < 0 ? `−${fmtArs(deviationArs)}` : fmtArs(deviationArs)}
          </div>
        </div>
      </div>

      {/* Rubros sin monto en pesos */}
      {sinMonto.length > 0 && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 13px",
            borderRadius: 9,
            background: "var(--surface-1)",
            border: "1px dashed var(--border-default)",
            fontSize: 11.5,
            color: "var(--text-tertiary)",
            lineHeight: 1.5,
          }}
        >
          Sin monto en pesos: {sinMonto.map((r) => r.name).join(", ")}. Cargales una cotización
          para poder seguir el avance.
        </div>
      )}

      {/* Pagos sin imputar */}
      {unassignedCount > 0 && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 13px",
            borderRadius: 9,
            background: "var(--warning-soft)",
            border: "1px solid var(--warning-border)",
            fontSize: 12,
            color: "var(--warning)",
            lineHeight: 1.5,
          }}
        >
          <span>⚠</span>
          <span>
            {fmtArs(unassignedArs)} en {unassignedCount}{" "}
            {unassignedCount === 1 ? "pago" : "pagos"} no está imputado a ningún presupuesto y no
            entra en estos números.
          </span>
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-quaternary)", lineHeight: 1.5 }}>
        Todo en pesos nominales, la moneda en la que se pactó con cada proveedor. El % es cuánto
        llevás pagado del presupuesto, no el avance físico de obra: si el % pagado va muy por
        delante de lo que ves en la obra, estás adelantando plata.
      </div>
    </div>
  );
}
