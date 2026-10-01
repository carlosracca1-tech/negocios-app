"use client";

import { Project } from "@/types";
import { fmt, fmtPct, safeNum } from "@/lib/format";

interface ProjectComparisonProps {
  projects: Project[];
}

/**
 * Tabla comparativa de proyectos: muestra métricas clave lado a lado.
 * Se ve solo cuando hay 2+ proyectos.
 */
export default function ProjectComparison({ projects }: ProjectComparisonProps) {
  if (projects.length < 2) return null;

  const sorted = [...projects].sort((a, b) => {
    // Vendidos primero, luego por margen descendente
    if (a.status === "vendido" && b.status !== "vendido") return -1;
    if (a.status !== "vendido" && b.status === "vendido") return 1;
    return safeNum(b.margin) - safeNum(a.margin);
  });

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{
        fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
        marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
      }}>
        Comparativo de proyectos
      </h3>

      <div className="responsive-table" style={{
        border: "1px solid var(--border-default)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <table style={{
          width: "100%", borderCollapse: "collapse", fontSize: 13,
        }}>
          <thead>
            <tr style={{ background: "var(--surface-1)" }}>
              <th style={thStyle}>Proyecto</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Compra</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Inversión</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Resultado</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Margen</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Días</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Anualizado</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const margin = safeNum(p.margin);
              const annualized = p.annualizedReturn;
              const hasSale = p.status === "vendido";

              return (
                <tr key={p.id} style={{ borderTop: "1px solid var(--border-faint)" }}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</span>
                    <span style={{
                      fontSize: 10, marginLeft: 8, padding: "2px 6px",
                      borderRadius: 4, background: "var(--surface-2)",
                      color: "var(--text-tertiary)",
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={tdRight}>{fmt(p.buyPrice)}</td>
                  <td style={tdRight}>{fmt(p.investment)}</td>
                  <td style={{
                    ...tdRight,
                    color: hasSale
                      ? safeNum(p.result) >= 0 ? "var(--success)" : "var(--danger)"
                      : "var(--text-tertiary)",
                  }}>
                    {hasSale ? fmt(p.result) : "—"}
                  </td>
                  <td style={{
                    ...tdRight,
                    color: hasSale
                      ? margin >= 15 ? "var(--success)" : margin >= 10 ? "var(--warning)" : "var(--danger)"
                      : "var(--text-tertiary)",
                  }}>
                    {hasSale ? fmtPct(margin) : p.estimatedMargin ? `~${fmtPct(p.estimatedMargin)}` : "—"}
                  </td>
                  <td style={tdRight}>
                    {p.daysHeld ? `${p.daysHeld}d` : "—"}
                  </td>
                  <td style={{
                    ...tdRight,
                    fontWeight: 600,
                    color: annualized != null
                      ? annualized >= 30 ? "var(--success)" : annualized >= 15 ? "var(--warning)" : "var(--danger)"
                      : "var(--text-tertiary)",
                  }}>
                    {annualized != null ? fmtPct(annualized) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  color: "var(--text-secondary)",
};

const tdRight: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};
