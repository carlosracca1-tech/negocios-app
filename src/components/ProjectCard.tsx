"use client";

import { Project } from "@/types";
import { fmt, fmtSign, fmtPct, daysAgo, safeNum } from "@/lib/format";
import { statusConfig } from "@/lib/constants";

interface ProjectCardProps {
  project: Project;
  sharedWith?: Array<{ name: string; email: string; role: string }>;
  onClick: () => void;
}

export default function ProjectCard({ project, sharedWith = [], onClick }: ProjectCardProps) {
  // Use pre-computed fields from API (computed by lib/financial.ts on the server)
  const buyPrice = safeNum(project.buyPrice);
  const totalCosts = safeNum(project.totalCosts);
  const inv = safeNum(project.investment);
  const sp = safeNum(project.salePrice);
  const lp = safeNum(project.listingPrice);
  // Display logic: null means "no sale yet" (controls which column to show)
  const hasSale = sp > 0;
  const result = hasSale ? safeNum(project.result) : null;
  const margin = hasSale ? safeNum(project.margin) : null;
  const estMargin = !hasSale && lp > 0 ? safeNum(project.estimatedMargin) : null;
  const isLoss = result !== null && result < 0;
  const highCosts = totalCosts > buyPrice * 0.4 && project.status === "activo";

  const statusStyle = statusConfig[project.status] || statusConfig.activo;
  const accentColor = isLoss ? "#f87171" : highCosts ? "#fbbf24" : "#38bdf8";

  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(12, 21, 36, 0.6)",
        backdropFilter: "blur(12px)",
        borderRadius: 16,
        border: "1px solid rgba(56, 189, 248, 0.08)",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.2)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(17, 29, 48, 0.8)";
        e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.2)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(56, 189, 248, 0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(12, 21, 36, 0.6)";
        e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.08)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0, 0, 0, 0.2)";
      }}
    >
      {/* Top accent glow line */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        opacity: 0.6,
      }} />

      <div style={{ padding: "18px 20px" }}>
        {/* Header: name + status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8edf5", lineHeight: 1.2 }}>{project.name}</div>
            <div style={{ fontSize: 12, color: "#8899b0", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                background: "rgba(56, 189, 248, 0.1)",
                color: "#7dd3fc",
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
              }}>
                {project.type}
              </span>
              {project.address && <span style={{ color: "#5a6b82" }}>{project.address}</span>}
            </div>
          </div>
          <span style={{
            background: statusStyle.bg,
            color: statusStyle.color,
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.3,
            boxShadow: `0 0 8px ${statusStyle.glow}`,
          }}>
            {statusStyle.t}
          </span>
        </div>

        {/* Financial summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#5a6b82", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>Inversión total</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7" }}>{fmt(inv)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#5a6b82", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>Costos</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#d4a574" }}>{fmt(totalCosts)}</div>
          </div>
          {sp > 0 ? (
            <div>
              <div style={{ fontSize: 10, color: "#5a6b82", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>Resultado</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: result !== null && result >= 0 ? "#34d399" : "#f87171" }}>
                {fmtSign(result)}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 10, color: "#5a6b82", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>Valor publ.</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8edf5" }}>{lp > 0 ? fmt(lp) : "—"}</div>
            </div>
          )}
        </div>

        {/* Margin row */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#5a6b82", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>
              {sp > 0 ? "Margen" : "Margen est."}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color:
                  (margin !== null && margin >= 0) || (estMargin !== null && estMargin >= 0) ? "#34d399" : (margin !== null || estMargin !== null) ? "#f87171" : "#5a6b82",
              }}
            >
              {sp > 0 ? fmtPct(margin) : estMargin !== null ? fmtPct(estMargin) : "—"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(56, 189, 248, 0.06)",
          paddingTop: 10,
        }}>
          <div style={{ fontSize: 11, color: "#5a6b82" }}>Actualizado {daysAgo(project.lastUpdate)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {sharedWith.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {sharedWith.slice(0, 3).map((u, i) => (
                  <div
                    key={i}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "rgba(56, 189, 248, 0.1)",
                      border: "1px solid rgba(56, 189, 248, 0.2)",
                      marginLeft: i > 0 ? -6 : 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#7dd3fc",
                    }}
                  >
                    {u.name.charAt(0)}
                  </div>
                ))}
                <span style={{ fontSize: 11, color: "#5a6b82", marginLeft: 4 }}>{sharedWith.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
