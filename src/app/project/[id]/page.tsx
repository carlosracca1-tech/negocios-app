"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import AddExpenseModal from "@/components/AddExpenseModal";
import ExpensesPanel from "@/components/ExpensesPanel";
import RegisterSaleModal from "@/components/RegisterSaleModal";
import AddInvestorModal from "@/components/AddInvestorModal";
import ProjectAlerts from "@/components/ProjectAlerts";
import { fmt, fmtSign, fmtPct, daysAgo, safeNum } from "@/lib/format";
import { statusConfig } from "@/lib/constants";

interface PageProps {
  params: { id: string };
}

export default function ProjectPage({ params }: PageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { project, loading, refetch } = useProject(params.id);
  const [activeSection, setActiveSection] = useState("resumen");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddCostModal, setShowAddCostModal] = useState(false);
  const [showRegisterSaleModal, setShowRegisterSaleModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddInvestorModal, setShowAddInvestorModal] = useState(false);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#060b14" }}>
        <Header />
        <div style={{ padding: "60px 20px", textAlign: "center", color: "#5a6b82" }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid rgba(56, 189, 248, 0.15)",
            borderTopColor: "#38bdf8",
            animation: "spin 1s linear infinite",
            margin: "0 auto 12px",
          }} />
          Cargando proyecto...
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main style={{ minHeight: "100vh", background: "#060b14" }}>
        <Header />
        <div style={{ padding: "60px 20px", textAlign: "center", color: "#5a6b82" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#5a6b82" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 16, opacity: 0.3 }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#e8edf5", marginBottom: 8 }}>Proyecto no encontrado</div>
          <button
            onClick={() => router.push("/")}
            style={{
              marginTop: 12,
              padding: "8px 20px",
              borderRadius: 10,
              border: "1px solid rgba(56, 189, 248, 0.2)",
              background: "rgba(56, 189, 248, 0.08)",
              color: "#7dd3fc",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  const p = project;

  // Role-based access control
  const userRole = session?.user?.role;
  const isAdmin = userRole === "admin";
  const canEdit = userRole === "admin" || userRole === "colaborador";

  const buyPrice = safeNum(p.buyPrice);
  const totalCosts = safeNum(p.totalCosts);
  const inv = safeNum(p.investment);
  const salePrice = safeNum(p.salePrice);
  const listingPrice = safeNum(p.listingPrice);
  const hasSale = salePrice > 0;
  const result = hasSale ? safeNum(p.result) : null;
  const margin = hasSale ? safeNum(p.margin) : null;
  const estMargin = !hasSale && listingPrice > 0 ? safeNum(p.estimatedMargin) : null;
  const costRatio = buyPrice > 0 ? (totalCosts / buyPrice) * 100 : 0;
  const buyDateRaw = p.buyDate ? new Date(p.buyDate) : null;
  const daysActive = buyDateRaw && !isNaN(buyDateRaw.getTime()) ? Math.floor((new Date().getTime() - buyDateRaw.getTime()) / 86400000) : 0;
  const costsArray = Array.isArray(p.costs) ? p.costs : [];
  const expensesArray = Array.isArray(p.expenses) ? p.expenses : [];
  const investorsArray = Array.isArray(p.investors) ? p.investors : [];
  const isInvestor = investorsArray.some((inv: any) => inv.userId === session?.user?.id);

  // Expenses summary for Resumen section
  const totalExpensesUsd = expensesArray.reduce((sum: number, e: any) => sum + (e.amountUsd ?? 0), 0);
  const expenseMonths = new Set(expensesArray.map((e: any) => {
    const d = new Date(e.period);
    return `${d.getFullYear()}-${d.getMonth()}`;
  })).size;
  const avgMonthlyExpense = expenseMonths > 0 ? totalExpensesUsd / expenseMonths : 0;

  // Group expenses by concept for mini-breakdown
  const expensesByConcept = useMemo(() => {
    const map: Record<string, number> = {};
    expensesArray.forEach((e: any) => {
      const key = e.concept || "Otros";
      map[key] = (map[key] || 0) + (e.amountUsd ?? 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expensesArray]);

  const statusStyle = statusConfig[p.status] || statusConfig.activo;

  return (
    <main style={{ minHeight: "100vh", background: "#060b14" }}>
      <Header />

      <div className="page-container" style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Breadcrumb + actions */}
        <div className="breadcrumb-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => router.back()}
              style={{
                background: "rgba(12, 21, 36, 0.6)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(56, 189, 248, 0.08)",
                borderRadius: 10,
                padding: "6px 14px",
                cursor: "pointer",
                fontSize: 13,
                color: "#8899b0",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.2)";
                e.currentTarget.style.color = "#7dd3fc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.08)";
                e.currentTarget.style.color = "#8899b0";
              }}
            >
              ← Volver
            </button>
            <div className="breadcrumb-path" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 20, width: 1, background: "rgba(56, 189, 248, 0.08)" }} />
              <span style={{ fontSize: 12, color: "#5a6b82" }}>Proyectos</span>
              <span style={{ fontSize: 12, color: "#5a6b82" }}>/</span>
              <span style={{ fontSize: 12, color: "#e8edf5", fontWeight: 500 }}>
                {p.name}
              </span>
            </div>
          </div>
          <div className="breadcrumb-actions" style={{ display: "flex", gap: 8 }}>
            {/* Exportar button - only for admin or colaborador */}
            {canEdit && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/projects/${params.id}/export`);
                    const json = await res.json();
                    const blob = new Blob(
                      [JSON.stringify(json.data, null, 2)],
                      { type: "application/json" }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${p.name.replace(/\s+/g, "-")}-reporte.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error("Export error:", err);
                  }
                }}
                style={{
                  background: "rgba(12, 21, 36, 0.6)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(56, 189, 248, 0.08)",
                  borderRadius: 10,
                  padding: "7px 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#8899b0",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.2)";
                  e.currentTarget.style.color = "#7dd3fc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.08)";
                  e.currentTarget.style.color = "#8899b0";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar
              </button>
            )}
            {/* Compartir button - only for admin */}
            {isAdmin && (
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  background: "rgba(12, 21, 36, 0.6)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(56, 189, 248, 0.08)",
                  borderRadius: 10,
                  padding: "7px 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#8899b0",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.2)";
                  e.currentTarget.style.color = "#7dd3fc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.08)";
                  e.currentTarget.style.color = "#8899b0";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> Compartir
              </button>
            )}
            {/* + Costo button - only for admin or colaborador */}
            {canEdit && (
              <button
                onClick={() => setShowAddCostModal(true)}
                style={{
                  background: "linear-gradient(135deg, #38bdf8, #7dd3fc)",
                  border: "none",
                  borderRadius: 10,
                  padding: "7px 16px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#060b14",
                  boxShadow: "0 2px 12px rgba(56, 189, 248, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(56, 189, 248, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(56, 189, 248, 0.2)";
                }}
              >
                + Costo
              </button>
            )}
            {/* + Gasto button - only for admin or colaborador */}
            {canEdit && (
              <button
                onClick={() => setShowAddExpenseModal(true)}
                style={{
                  background: "linear-gradient(135deg, #d4a574, #e8d5b7)",
                  border: "none",
                  borderRadius: 10,
                  padding: "7px 16px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#060b14",
                  boxShadow: "0 2px 12px rgba(212, 165, 116, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(212, 165, 116, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(212, 165, 116, 0.2)";
                }}
              >
                + Gasto
              </button>
            )}
            {/* Venta button - only for admin or colaborador */}
            {canEdit && p.status !== "vendido" && (
              <button
                onClick={() => setShowRegisterSaleModal(true)}
                style={{
                  background: "linear-gradient(135deg, #34d399, #6ee7b7)",
                  border: "none",
                  borderRadius: 10,
                  padding: "7px 16px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#060b14",
                  boxShadow: "0 2px 12px rgba(52, 211, 153, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(52, 211, 153, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(52, 211, 153, 0.2)";
                }}
              >
                Venta
              </button>
            )}
          </div>
        </div>

        {/* Project header */}
        <div
          style={{
            background: "rgba(12, 21, 36, 0.6)",
            backdropFilter: "blur(12px)",
            borderRadius: 14,
            border: "1px solid rgba(56, 189, 248, 0.08)",
            padding: "16px 20px",
            marginBottom: 16,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "linear-gradient(90deg, #38bdf8, #d4a574, #38bdf8)",
            opacity: 0.4,
          }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="project-name" style={{ fontSize: 24, fontWeight: 700, color: "#e8edf5" }}>
                  {p.name}
                </span>
                <span
                  style={{
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    padding: "4px 14px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    boxShadow: `0 0 8px ${statusStyle.glow}`,
                  }}
                >
                  {statusStyle.t}
                </span>
              </div>
              <div
                className="project-header-meta"
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 8,
                  fontSize: 12,
                  color: "#5a6b82",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    background: "rgba(56, 189, 248, 0.08)",
                    color: "#7dd3fc",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {p.type}
                </span>
                {p.address && <span style={{ color: "#8899b0" }}>{p.address}</span>}
                <span style={{ color: "#8899b0" }}>Compra: {new Date(p.buyDate).toLocaleDateString("es-AR")}</span>
                <span style={{ color: "#8899b0" }}>{daysActive} días activo</span>
                <span style={{ color: "#8899b0" }}>Actualizado {daysAgo(p.lastUpdate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div
          className="kpi-grid-6"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {(
            [
              { label: "Compra", value: fmt(buyPrice), color: "#e8d5b7" },
              {
                label: "Costos",
                value: fmt(totalCosts),
                sub: costRatio > 40 ? `${costRatio.toFixed(0)}% de compra` : undefined,
                subColor: costRatio > 40 ? "#fbbf24" : undefined,
                color: "#d4a574",
              },
              { label: "Inversión Total", value: fmt(inv), bold: true, color: "#e8edf5" },
              p.salePrice
                ? { label: "Venta", value: fmt(salePrice), color: "#38bdf8" }
                : {
                    label: "Valor publicación",
                    value: p.listingPrice ? fmt(listingPrice) : "—",
                  },
              p.salePrice
                ? {
                    label: "Resultado",
                    value: fmtSign(result!),
                    color: result! >= 0 ? "#34d399" : "#f87171",
                  }
                : {
                    label: "Margen est.",
                    value: estMargin !== null ? fmtPct(estMargin) : "—",
                    color: estMargin !== null ? (estMargin >= 0 ? "#34d399" : "#f87171") : "#5a6b82",
                  },
              p.salePrice
                ? {
                    label: "Margen",
                    value: fmtPct(margin!),
                    color: margin! >= 0 ? "#34d399" : "#f87171",
                  }
                : { label: "", value: "" },
            ] as Array<{ label: string; value: string; color?: string; sub?: string; subColor?: string; bold?: boolean }>
          )
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

        {/* Section tabs - scrollable on mobile */}
        <div
          className="section-tabs"
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 16,
            background: "rgba(12, 21, 36, 0.6)",
            backdropFilter: "blur(12px)",
            borderRadius: 12,
            border: "1px solid rgba(56, 189, 248, 0.08)",
            overflow: "hidden",
          }}
        >
          {[
            { key: "resumen", label: "Resumen" },
            { key: "costos", label: `Costos (${costsArray.length})` },
            { key: "gastos", label: `Gastos (${expensesArray.length})` },
            { key: "timeline", label: "Timeline" },
            ...(isAdmin ? [{ key: "acceso", label: `Acceso (${(p.access || []).length || 0})` }] : []),
            ...((isAdmin || isInvestor) ? [{ key: "capital", label: "Capital" }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              className="section-tab"
              onClick={() => setActiveSection(tab.key)}
              style={{
                flex: 1,
                padding: "12px 0",
                fontSize: 13,
                fontWeight: activeSection === tab.key ? 600 : 400,
                color: activeSection === tab.key ? "#7dd3fc" : "#5a6b82",
                background: activeSection === tab.key ? "rgba(56, 189, 248, 0.06)" : "transparent",
                border: "none",
                borderBottom:
                  activeSection === tab.key
                    ? "2px solid #38bdf8"
                    : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (activeSection !== tab.key) {
                  e.currentTarget.style.color = "#8899b0";
                  e.currentTarget.style.background = "rgba(56, 189, 248, 0.03)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== tab.key) {
                  e.currentTarget.style.color = "#5a6b82";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div
          className="section-content"
          style={{
            background: "rgba(12, 21, 36, 0.6)",
            backdropFilter: "blur(12px)",
            borderRadius: 14,
            border: "1px solid rgba(56, 189, 248, 0.08)",
            overflow: "hidden",
            padding: "24px",
          }}
        >
          {activeSection === "resumen" && (
            <div>
              <ProjectAlerts
                buyPrice={buyPrice}
                totalCosts={totalCosts}
                investment={inv}
                listingPrice={listingPrice}
                estimatedMargin={estMargin}
                salePrice={salePrice}
                totalExpenses={totalExpensesUsd}
                avgMonthlyExpense={avgMonthlyExpense}
              />
              <CostBreakdown
                costs={costsArray}
                projectType={p.type}
                totalCosts={totalCosts}
              />

              {/* ===================== */}
              {/* GASTOS MENSUALES RESUMEN */}
              {/* ===================== */}
              <div style={{ marginTop: 32 }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8edf5" }}>
                    Gastos mensuales
                  </div>
                  {expensesArray.length > 0 && (
                    <button
                      onClick={() => setActiveSection("gastos")}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(212, 165, 116, 0.2)",
                        borderRadius: 8,
                        padding: "4px 12px",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#d4a574",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(212, 165, 116, 0.08)";
                        e.currentTarget.style.borderColor = "rgba(212, 165, 116, 0.35)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "rgba(212, 165, 116, 0.2)";
                      }}
                    >
                      Ver detalle →
                    </button>
                  )}
                </div>

                {expensesArray.length === 0 ? (
                  <div style={{
                    background: "rgba(6, 11, 20, 0.4)",
                    borderRadius: 12,
                    border: "1px dashed rgba(212, 165, 116, 0.15)",
                    padding: "24px 16px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 11, color: "#5a6b82", marginBottom: 8 }}>
                      Sin gastos mensuales registrados
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => setShowAddExpenseModal(true)}
                        style={{
                          background: "rgba(212, 165, 116, 0.1)",
                          border: "1px solid rgba(212, 165, 116, 0.2)",
                          borderRadius: 8,
                          padding: "6px 14px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#d4a574",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(212, 165, 116, 0.15)";
                          e.currentTarget.style.borderColor = "rgba(212, 165, 116, 0.35)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(212, 165, 116, 0.1)";
                          e.currentTarget.style.borderColor = "rgba(212, 165, 116, 0.2)";
                        }}
                      >
                        + Agregar gasto mensual
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Expense KPIs row */}
                    <div className="kpi-grid-4" style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 10,
                      marginBottom: 16,
                    }}>
                      <div style={{
                        background: "rgba(6, 11, 20, 0.5)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        border: "1px solid rgba(212, 165, 116, 0.08)",
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "#5a6b82", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                          Total gastos
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#d4a574" }}>
                          U$D {totalExpensesUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 10, color: "#5a6b82", marginTop: 2 }}>
                          {expenseMonths} {expenseMonths === 1 ? "mes" : "meses"}
                        </div>
                      </div>
                      <div style={{
                        background: "rgba(6, 11, 20, 0.5)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        border: "1px solid rgba(212, 165, 116, 0.08)",
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "#5a6b82", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                          Promedio mensual
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#e8edf5" }}>
                          U$D {avgMonthlyExpense.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 10, color: "#5a6b82", marginTop: 2 }}>
                          USD/mes
                        </div>
                      </div>
                      <div style={{
                        background: "rgba(6, 11, 20, 0.5)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        border: "1px solid rgba(212, 165, 116, 0.08)",
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "#5a6b82", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                          Impacto s/ inversión
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: inv > 0 && (totalExpensesUsd / inv * 100) > 5 ? "#fbbf24" : "#e8edf5" }}>
                          {inv > 0 ? `${(totalExpensesUsd / inv * 100).toFixed(1)}%` : "—"}
                        </div>
                        <div style={{ fontSize: 10, color: "#5a6b82", marginTop: 2 }}>
                          del total invertido
                        </div>
                      </div>
                    </div>

                    {/* Expense concept breakdown */}
                    {expensesByConcept.length > 0 && (
                      <div style={{
                        background: "rgba(6, 11, 20, 0.4)",
                        borderRadius: 10,
                        border: "1px solid rgba(212, 165, 116, 0.06)",
                        overflow: "hidden",
                      }}>
                        {expensesByConcept.slice(0, 5).map(([concept, amount], i) => {
                          const pct = totalExpensesUsd > 0 ? (amount / totalExpensesUsd) * 100 : 0;
                          return (
                            <div key={concept} style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "10px 14px",
                              borderBottom: i < expensesByConcept.length - 1 && i < 4
                                ? "1px solid rgba(212, 165, 116, 0.04)" : "none",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                <div style={{
                                  width: 6, height: 6, borderRadius: 99,
                                  background: "#d4a574", flexShrink: 0,
                                  opacity: 1 - (i * 0.15),
                                }} />
                                <span style={{
                                  fontSize: 13, fontWeight: 500, color: "#e8edf5",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                  {concept}
                                </span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                <div style={{
                                  width: 60, height: 4, borderRadius: 2,
                                  background: "rgba(212, 165, 116, 0.1)",
                                  overflow: "hidden",
                                }}>
                                  <div style={{
                                    width: `${pct}%`, height: "100%",
                                    background: "linear-gradient(90deg, #d4a574, #e8d5b7)",
                                    borderRadius: 2,
                                  }} />
                                </div>
                                <span style={{
                                  fontSize: 13, fontWeight: 600, color: "#d4a574",
                                  fontVariantNumeric: "tabular-nums", minWidth: 80, textAlign: "right",
                                }}>
                                  U$D {amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {expensesByConcept.length > 5 && (
                          <div style={{
                            padding: "8px 14px",
                            fontSize: 11,
                            color: "#5a6b82",
                            textAlign: "center",
                            borderTop: "1px solid rgba(212, 165, 116, 0.04)",
                          }}>
                            +{expensesByConcept.length - 5} conceptos más
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Financial summary */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#e8edf5",
                  marginTop: 32,
                  marginBottom: 12,
                }}
              >
                Resumen financiero
              </div>

              <div className="responsive-table">
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <tbody>
                    {([
                      { label: "Precio de compra", value: fmt(buyPrice) },
                      { label: "Total costos", value: fmt(totalCosts) },
                      ...(totalExpensesUsd > 0 ? [{
                        label: "Total gastos mensuales",
                        value: `U$D ${totalExpensesUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        color: "#d4a574",
                      }] : []),
                      { label: "Inversión total", value: fmt(inv), bold: true },
                      ...(p.salePrice
                        ? [
                            { label: "Precio de venta", value: fmt(salePrice) },
                            {
                              label: "Resultado neto",
                              value: fmtSign(result!),
                              color: result! >= 0 ? "#34d399" : "#f87171",
                            },
                            {
                              label: "Margen",
                              value: fmtPct(margin!),
                              color: margin! >= 0 ? "#34d399" : "#f87171",
                            },
                          ]
                        : p.listingPrice
                          ? [
                              { label: "Valor de publicación", value: fmt(listingPrice) },
                              {
                                label: "Margen estimado",
                                value: fmtPct(estMargin!),
                                color: estMargin! >= 0 ? "#34d399" : "#f87171",
                              },
                            ]
                          : []),
                      {
                        label: "Ratio costos/compra",
                        value: `${costRatio.toFixed(1)}%`,
                        color: costRatio > 40 ? "#fbbf24" : "#e8edf5",
                      },
                      { label: "Días activo", value: `${daysActive}` },
                    ] as Array<{ label: string; value: string; bold?: boolean; color?: string }>).map(({ label, value, bold, color }, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: "1px solid rgba(56, 189, 248, 0.06)",
                        }}
                      >
                        <td className="financial-table" style={{ padding: "10px 0", color: "#5a6b82" }}>
                          {label}
                        </td>
                        <td
                          className="financial-table"
                          style={{
                            padding: "10px 0",
                            textAlign: "right",
                            color: color || "#e8edf5",
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

              {/* Capital compact widget */}
              {investorsArray.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <CapitalPanel investors={investorsArray} totalInvested={inv} compact />
                </div>
              )}
            </div>
          )}

          {activeSection === "costos" && (
            <CostsTable
              costs={costsArray}
              onAddClick={() => setShowAddCostModal(true)}
              canEdit={canEdit}
            />
          )}

          {activeSection === "gastos" && (
            <ExpensesPanel
              expenses={expensesArray}
              onAddClick={() => setShowAddExpenseModal(true)}
              canEdit={canEdit}
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
            <CapitalPanel
              investors={investorsArray}
              totalInvested={inv}
              isAdmin={isAdmin}
              projectId={params.id}
              saleResult={hasSale ? result : null}
              onAddInvestor={() => setShowAddInvestorModal(true)}
              onRefetch={() => refetch()}
            />
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
        projectType={p.type}
        isOpen={showAddCostModal}
        onClose={() => setShowAddCostModal(false)}
        onSuccess={() => refetch()}
      />

      <AddExpenseModal
        projectId={params.id}
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        onSuccess={() => refetch()}
      />

      <RegisterSaleModal
        projectId={params.id}
        isOpen={showRegisterSaleModal}
        onClose={() => setShowRegisterSaleModal(false)}
        onSuccess={() => refetch()}
        investors={investorsArray}
        totalInvestment={inv}
      />

      <AddInvestorModal
        projectId={params.id}
        isOpen={showAddInvestorModal}
        onClose={() => setShowAddInvestorModal(false)}
        onSuccess={() => refetch()}
      />
    </main>
  );
}
