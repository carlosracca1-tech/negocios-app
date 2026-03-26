"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/useProjects";
import Header from "@/components/Header";
import KPICard from "@/components/KPICard";
import CostBreakdown from "@/components/CostBreakdown";
import CostsTable from "@/components/CostsTable";
import Timeline from "@/components/Timeline";
import AccessPanel from "@/components/AccessPanel";
import CapitalPanel from "@/components/CapitalPanel";
import ShareModal from "@/components/ShareModal";
import AddCostModal from "@/components/AddCostModal";
import RegisterSaleModal from "@/components/RegisterSaleModal";

interface PageProps {
  params: { id: string };
}

export default function ProjectPage({ params }: PageProps) {
  const router = useRouter();
  const { project, loading, refetch } = useProject(params.id);
  const [activeSection, setActiveSection] = useState("resumen");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddCostModal, setShowAddCostModal] = useState(false);
  const [showRegisterSaleModal, setShowRegisterSaleModal] = useState(false);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#f8f9fa" }}>
        <Header />
        <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
          Cargando proyecto...
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main style={{ minHeight: "100vh", background: "#f8f9fa" }}>
        <Header />
        <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
          Proyecto no encontrado
        </div>
      </main>
    );
  }

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

  const p = project;
  const inv = p.buyPrice + (p.costs || 0);
  const result = p.salePrice ? p.salePrice - inv : null;
  const margin = p.salePrice ? ((p.salePrice - inv) / inv) * 100 : null;
  const estMargin = !p.salePrice && p.listingPrice ? ((p.listingPrice - inv) / inv) * 100 : null;
  const costRatio = p.buyPrice > 0 ? ((p.costs || 0) / p.buyPrice) * 100 : 0;
  const daysActive = Math.floor((new Date().getTime() - new Date(p.buyDate).getTime()) / 86400000);

  const statusConfig: Record<string, { bg: string; color: string; t: string }> = {
    vendido: { bg: "#E8F5E9", color: "#2E7D32", t: "Vendido" },
    activo: { bg: "#E3F2FD", color: "#1565C0", t: "Activo" },
    pausado: { bg: "#F5F5F5", color: "#757575", t: "Pausado" },
  };

  const statusStyle = statusConfig[p.status] || statusConfig.activo;

  return (
    <main style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <Header />

      <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Breadcrumb + actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => router.back()}
              style={{
                background: "#f5f5f5",
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 13,
                color: "#555",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              ← Volver
            </button>
            <div style={{ height: 20, width: 1, background: "#e0e0e0" }} />
            <span style={{ fontSize: 12, color: "#999" }}>Proyectos</span>
            <span style={{ fontSize: 12, color: "#999" }}>/</span>
            <span style={{ fontSize: 12, color: "#1a1a1a", fontWeight: 500 }}>
              {p.name}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowShareModal(true)}
              style={{
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: "7px 14px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                color: "#555",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: 14 }}>👥</span> Compartir
            </button>
            <button
              onClick={() => setShowAddCostModal(true)}
              style={{
                background: "#1B3A5C",
                border: "none",
                borderRadius: 8,
                padding: "7px 14px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                color: "#fff",
              }}
            >
              + Agregar Costo
            </button>
            {p.status !== "vendido" && (
              <button
                onClick={() => setShowRegisterSaleModal(true)}
                style={{
                  background: "#2E7D32",
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                }}
              >
                Registrar Venta
              </button>
            )}
          </div>
        </div>

        {/* Project header */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #f0f0f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            padding: "20px 24px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>
                  {p.name}
                </span>
                <span
                  style={{
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    padding: "4px 12px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {statusStyle.t}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 8,
                  fontSize: 12,
                  color: "#888",
                }}
              >
                <span
                  style={{
                    background: p.type === "Casa" ? "#E8EAF6" : "#E3F2FD",
                    color: p.type === "Casa" ? "#1B3A5C" : "#5C6BC0",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {p.type}
                </span>
                {p.address && <span>{p.address}</span>}
                <span>Compra: {new Date(p.buyDate).toLocaleDateString("es-AR")}</span>
                <span>{daysActive} días activo</span>
                <span>Actualizado {daysAgo(p.lastUpdate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {[
            { label: "Compra", value: fmt(p.buyPrice) },
            {
              label: "Costos",
              value: fmt(p.costs || 0),
              sub: costRatio > 40 ? `${costRatio.toFixed(0)}% de compra` : null,
              subColor: costRatio > 40 ? "#E65100" : null,
            },
            { label: "Inversión Total", value: fmt(inv), bold: true },
            p.salePrice
              ? { label: "Venta", value: fmt(p.salePrice) }
              : {
                  label: "Valor publicación",
                  value: p.listingPrice ? fmt(p.listingPrice) : "—",
                },
            p.salePrice
              ? {
                  label: "Resultado",
                  value: fmtSign(result!),
                  color: result! >= 0 ? "#2E7D32" : "#C62828",
                }
              : {
                  label: "Margen est.",
                  value: estMargin !== null ? fmtPct(estMargin) : "—",
                  color: estMargin !== null ? (estMargin >= 0 ? "#2E7D32" : "#C62828") : "#bbb",
                },
            p.salePrice
              ? {
                  label: "Margen",
                  value: fmtPct(margin!),
                  color: margin! >= 0 ? "#2E7D32" : "#C62828",
                }
              : { label: "", value: "" },
          ]
            .filter((k) => k.label)
            .map((k, i) => (
              <KPICard
                key={i}
                label={k.label}
                value={k.value}
                sub={k.sub}
                subColor={k.subColor}
                color={k.color}
                bold={k.bold}
              />
            ))}
        </div>

        {/* Section tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 16,
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #f0f0f0",
            overflow: "hidden",
          }}
        >
          {[
            { key: "resumen", label: "Resumen" },
            { key: "costos", label: `Costos (${(p.costs || []).length || 0})` },
            { key: "timeline", label: "Timeline" },
            { key: "acceso", label: `Acceso (${(p.access || []).length || 0})` },
            { key: "capital", label: "Capital" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              style={{
                flex: 1,
                padding: "11px 0",
                fontSize: 13,
                fontWeight: activeSection === tab.key ? 600 : 400,
                color: activeSection === tab.key ? "#1B3A5C" : "#999",
                background: activeSection === tab.key ? "#F0F4F8" : "transparent",
                border: "none",
                borderBottom:
                  activeSection === tab.key
                    ? "2px solid #1B3A5C"
                    : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #f0f0f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            overflow: "hidden",
            padding: "24px",
          }}
        >
          {activeSection === "resumen" && (
            <div>
              <CostBreakdown
                costs={p.costs || []}
                projectType={p.type}
                totalCosts={p.costs || 0}
              />

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1a1a1a",
                  marginTop: 32,
                  marginBottom: 12,
                }}
              >
                Resumen financiero
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <tbody>
                  {[
                    ["Precio de compra", fmt(p.buyPrice)],
                    ["Total costos", fmt(p.costs || 0)],
                    ["Inversión total", fmt(inv), true],
                    ...(p.salePrice
                      ? [
                          ["Precio de venta", fmt(p.salePrice)],
                          [
                            "Resultado neto",
                            fmtSign(result!),
                            false,
                            result! >= 0 ? "#2E7D32" : "#C62828",
                          ] as any,
                          [
                            "Margen",
                            fmtPct(margin!),
                            false,
                            margin! >= 0 ? "#2E7D32" : "#C62828",
                          ] as any,
                        ]
                      : p.listingPrice
                        ? [
                            ["Valor de publicación", fmt(p.listingPrice)],
                            [
                              "Margen estimado",
                              fmtPct(estMargin!),
                              false,
                              estMargin! >= 0 ? "#2E7D32" : "#C62828",
                            ] as any,
                          ]
                        : []),
                    [
                      "Ratio costos/compra",
                      `${costRatio.toFixed(1)}%`,
                      false,
                      costRatio > 40 ? "#E65100" : "#1a1a1a",
                    ] as any,
                    ["Días activo", `${daysActive}`],
                  ].map(([label, value, bold, color], i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid #f5f5f5",
                      }}
                    >
                      <td style={{ padding: "10px 0", color: "#666" }}>
                        {label}
                      </td>
                      <td
                        style={{
                          padding: "10px 0",
                          textAlign: "right",
                          color: color || "#1a1a1a",
                          fontWeight: bold ? 700 : 600,
                        }}
                      >
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSection === "costos" && (
            <CostsTable
              costs={p.costs || []}
              onAddClick={() => setShowAddCostModal(true)}
            />
          )}

          {activeSection === "timeline" && (
            <Timeline events={p.timeline || []} />
          )}

          {activeSection === "acceso" && (
            <AccessPanel
              access={p.access || []}
              onShareClick={() => setShowShareModal(true)}
            />
          )}

          {activeSection === "capital" && (
            <CapitalPanel investors={[]} totalInvested={inv} />
          )}
        </div>
      </div>

      <ShareModal
        projectId={params.id}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onSuccess={() => refetch()}
      />

      <AddCostModal
        projectId={params.id}
        isOpen={showAddCostModal}
        onClose={() => setShowAddCostModal(false)}
        onSuccess={() => refetch()}
      />

      <RegisterSaleModal
        projectId={params.id}
        isOpen={showRegisterSaleModal}
        onClose={() => setShowRegisterSaleModal(false)}
        onSuccess={() => refetch()}
      />
    </main>
  );
}
