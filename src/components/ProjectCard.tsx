"use client";

import { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  sharedWith?: Array<{ name: string; email: string; role: string }>;
  onClick: () => void;
}

export default function ProjectCard({ project, sharedWith = [], onClick }: ProjectCardProps) {
  const fmt = (n: number) => (n == null ? "—" : "$" + Math.abs(n).toLocaleString("en-US"));
  const fmtSign = (n: number) => (n == null ? "—" : (n >= 0 ? "+" : "-") + "$" + Math.abs(n).toLocaleString("en-US"));
  const fmtPct = (n: number) => (n == null ? "—" : n.toFixed(1) + "%");

  const daysAgo = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return "hoy";
    if (diff === 1) return "ayer";
    if (diff < 7) return `${diff}d`;
    if (diff < 30) return `${Math.floor(diff / 7)}sem`;
    return `${Math.floor(diff / 30)}m`;
  };

  const inv = project.buyPrice + (project.costs || 0);
  const result = project.salePrice ? project.salePrice - inv : null;
  const margin = project.salePrice ? ((project.salePrice - inv) / inv) * 100 : null;
  const estMargin = !project.salePrice && project.listingPrice ? ((project.listingPrice - inv) / inv) * 100 : null;
  const isLoss = result !== null && result < 0;
  const highCosts = (project.costs || 0) > project.buyPrice * 0.4 && project.status === "activo";

  const statusConfig: Record<string, { bg: string; color: string; t: string }> = {
    vendido: { bg: "#E8F5E9", color: "#2E7D32", t: "Vendido" },
    activo: { bg: "#E3F2FD", color: "#1565C0", t: "Activo" },
    pausado: { bg: "#F5F5F5", color: "#757575", t: "Pausado" },
  };

  const statusStyle = statusConfig[project.status] || statusConfig.activo;

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 12,
        border: isLoss ? "1px solid #FFCDD2" : highCosts ? "1px solid #FFE0B2" : "1px solid #f0f0f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        cursor: "pointer",
        transition: "all 0.15s",
        overflow: "hidden",
        ...(isLoss ? { background: "#FFFAFA" } : {}),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Card top bar with type color */}
      <div style={{ height: 4, background: project.type === "Casa" ? "#1B3A5C" : "#5C6BC0" }} />

      <div style={{ padding: "16px 20px" }}>
        {/* Header: name + status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.2 }}>{project.name}</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ background: project.type === "Casa" ? "#E8EAF6" : "#E3F2FD", color: project.type === "Casa" ? "#1B3A5C" : "#5C6BC0", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                {project.type}
              </span>
              {project.address && <span>{project.address}</span>}
            </div>
          </div>
          <span style={{ background: statusStyle.bg, color: statusStyle.color, padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, letterSpacing: 0.3 }}>
            {statusStyle.t}
          </span>
        </div>

        {/* Quick financial summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>Inversión total</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{fmt(inv)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>Costos</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{fmt(project.costs || 0)}</div>
          </div>
          {project.salePrice ? (
            <div>
              <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>Resultado</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: result! >= 0 ? "#2E7D32" : "#C62828" }}>
                {fmtSign(result!)}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>Valor publ.</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{project.listingPrice ? fmt(project.listingPrice) : "—"}</div>
            </div>
          )}
        </div>

        {/* Second row for margin */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div></div>
          <div></div>
          <div>
            <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {project.salePrice ? "Margen" : "Margen est."}
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color:
                  (margin !== null && margin >= 0) || (estMargin !== null && estMargin >= 0) ? "#2E7D32" : (margin !== null || estMargin !== null) ? "#C62828" : "#bbb",
              }}
            >
              {project.salePrice ? fmtPct(margin!) : estMargin !== null ? fmtPct(estMargin) : "—"}
            </div>
          </div>
        </div>

        {/* Footer: update + shared */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f5f5f5", paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: "#bbb" }}>Actualizado {daysAgo(project.lastUpdate)}</div>
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
                      background: "#E3F2FD",
                      border: "2px solid #fff",
                      marginLeft: i > 0 ? -6 : 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#1565C0",
                    }}
                  >
                    {u.name.charAt(0)}
                  </div>
                ))}
                <span style={{ fontSize: 10, color: "#bbb", marginLeft: 4 }}>{sharedWith.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
