"use client";

import { Project } from "@/types";
import { fmtMoney, fmtPct, daysAgo, safeNum } from "@/lib/format";
import { semaforoMargen } from "@/lib/financial";
import { statusConfig } from "@/lib/constants";

const SEMAFORO_COLOR: Record<string, string> = {
  verde: "var(--success)",
  ambar: "var(--warning)",
  rojo: "var(--danger)",
};

interface ProjectCardProps {
  project: Project;
  sharedWith?: Array<{ name: string; email: string; role: string }>;
  onClick: () => void;
}

export default function ProjectCard({ project, sharedWith = [], onClick }: ProjectCardProps) {
  const buyPrice = safeNum(project.buyPrice);
  const totalCosts = safeNum(project.totalCosts);
  const inv = safeNum(project.investment);
  const sp = safeNum(project.salePrice);
  const lp = safeNum(project.listingPrice);
  const hasSale = sp > 0;
  const result = hasSale ? safeNum(project.result) : null;
  const margin = hasSale ? safeNum(project.margin) : null;
  const estMargin = !hasSale && lp > 0 ? safeNum(project.estimatedMargin) : null;
  const isLoss = result !== null && result < 0;
  const highCosts = totalCosts > buyPrice * 0.4 && project.status === "activo";

  const statusStyle = statusConfig[project.status] || statusConfig.activo;
  const accentVar = isLoss ? "--danger" : highCosts ? "--warning" : "--accent";

  return (
    <div
      onClick={onClick}
      className="glass-card"
      style={{
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-card-hover)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-card)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, var(${accentVar}), transparent)`,
        opacity: 0.6,
      }} />

      <div style={{ padding: "18px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="truncate" style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2, letterSpacing: "-0.3px" }}>
              {project.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                border: "1px solid var(--border-default)",
              }}>
                {project.type}
              </span>
              {project.address && <span className="truncate" style={{ color: "var(--text-tertiary)" }}>{project.address}</span>}
            </div>
          </div>
          <span style={{
            background: statusStyle.bg,
            color: statusStyle.color,
            padding: "4px 12px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.3,
            border: `1px solid ${statusStyle.color}33`,
            flexShrink: 0,
          }}>
            {statusStyle.t}
          </span>
        </div>

        {/* Resumen financiero: una fila por dato, ningun monto se corta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Inversión", value: fmtMoney(inv), color: "var(--text-primary)" },
            { label: "Costos", value: fmtMoney(totalCosts), color: "var(--text-primary)" },
            sp > 0
              ? { label: "Resultado", value: fmtMoney(result, "USD", { signo: true }), color: result !== null && result >= 0 ? "var(--success)" : "var(--danger)" }
              : { label: "Valor publicación", value: lp > 0 ? fmtMoney(lp) : "—", color: "var(--text-primary)" },
            {
              label: sp > 0 ? "Margen" : "Margen est.",
              value: sp > 0 ? fmtPct(margin) : estMargin !== null ? fmtPct(estMargin) : "—",
              color: margin !== null
                ? SEMAFORO_COLOR[semaforoMargen(margin)]
                : estMargin !== null
                  ? SEMAFORO_COLOR[semaforoMargen(estMargin)]
                  : "var(--text-tertiary)",
            },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{row.label}</span>
              <span className="tabular" style={{ fontSize: 16, fontWeight: 700, color: row.color, whiteSpace: "nowrap" }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: "1px solid var(--border-faint)", paddingTop: 10,
        }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Actualizado {daysAgo(project.lastUpdate)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {sharedWith.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {sharedWith.slice(0, 3).map((u, i) => (
                  <div
                    key={i}
                    style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-default)",
                      marginLeft: i > 0 ? -6 : 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 600, color: "var(--text-primary)",
                    }}
                  >
                    {u.name.charAt(0)}
                  </div>
                ))}
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 4 }}>{sharedWith.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
