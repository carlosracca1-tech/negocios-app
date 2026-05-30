"use client";

import type { BudgetProjection } from "@/types";
import { catColors } from "@/lib/constants";

interface Props {
  projection: BudgetProjection;
}

export default function PresupuestadoVsReal({ projection }: Props) {
  const { totalProjected, totalExecuted, deviation, byRubro } = projection;

  const fmtN = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <div style={{
      background: "var(--surface-1)", border: "1px solid var(--border-faint)",
      borderRadius: 12, overflow: "hidden",
    }}>
      {/* Header row - hidden on mobile via CSS */}
      <div
        className="pvr-head-row"
        style={{
          display: "grid",
          gridTemplateColumns: "178px 1fr 108px 108px 84px",
          alignItems: "center", gap: 14, padding: "13px 17px",
          fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6,
          color: "var(--text-tertiary)", fontWeight: 600,
          background: "var(--surface-2)",
        }}
      >
        <div>Rubro</div>
        <div>Avance ejecutado</div>
        <div className="tabular" style={{ textAlign: "right" }}>Presup.</div>
        <div className="tabular" style={{ textAlign: "right" }}>Ejecutado</div>
        <div className="tabular" style={{ textAlign: "right" }}>Desvio</div>
      </div>

      {/* Data rows */}
      {byRubro.map((r) => {
        const pct = r.projected > 0 ? Math.min((r.executed / r.projected) * 100, 100) : 0;
        const isOver = r.executed > r.projected && r.projected > 0;
        const barColor = isOver ? "var(--warning)" : pct >= 100 ? "var(--success)" : "var(--text-secondary)";
        const devColor = r.deviation > 0 ? "var(--success)" : r.deviation < 0 ? "var(--danger)" : "var(--text-tertiary)";
        const devText = r.executed === 0 ? "—" : r.deviation > 0 ? `+${fmtN(r.deviation)}` : r.deviation < 0 ? `${fmtN(r.deviation)}` : "0";
        const dotColor = catColors[r.category] || "var(--text-secondary)";

        return (
          <div
            key={r.partidaId}
            className="pvr-data-row"
            style={{
              display: "grid",
              gridTemplateColumns: "178px 1fr 108px 108px 84px",
              alignItems: "center", gap: 14, padding: "13px 17px",
              borderBottom: "1px solid var(--border-faint)", fontSize: 13,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 500, color: "var(--text-primary)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: dotColor }} />
              <span className="truncate">{r.name}</span>
            </div>
            <div style={{ height: 8, background: "var(--bg)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 6, width: `${pct}%`, background: barColor }} />
            </div>
            <div className="tabular" data-label="Presup." style={{ textAlign: "right", fontWeight: 600, color: "var(--text-tertiary)" }}>{fmtN(r.projected)}</div>
            <div className="tabular" data-label="Ejecutado" style={{ textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>{fmtN(r.executed)}</div>
            <div className="tabular" data-label="Desvio" style={{ textAlign: "right", fontWeight: 600, color: devColor }}>{devText}</div>
          </div>
        );
      })}

      {/* Footer total */}
      <div
        className="pvr-data-row"
        style={{
          display: "grid",
          gridTemplateColumns: "178px 1fr 108px 108px 84px",
          gap: 14, padding: "15px 17px",
          background: "var(--surface-2)", borderTop: "1px solid var(--accent)",
          fontSize: 13.5, fontWeight: 700,
        }}
      >
        <div data-label="" style={{ color: "var(--text-primary)" }}>Total obra</div>
        <div />
        <div className="tabular" data-label="Presup." style={{ textAlign: "right", color: "var(--text-primary)" }}>{fmtN(totalProjected)}</div>
        <div className="tabular" data-label="Ejecutado" style={{ textAlign: "right", color: "var(--text-primary)" }}>{fmtN(totalExecuted)}</div>
        <div
          className="tabular"
          data-label="Desvio"
          style={{
            textAlign: "right",
            color: deviation > 0 ? "var(--success)" : deviation < 0 ? "var(--danger)" : "var(--text-primary)",
          }}
        >
          {deviation > 0 ? `+${fmtN(deviation)}` : fmtN(deviation)}
        </div>
      </div>
    </div>
  );
}
