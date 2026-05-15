"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useProject, useDeleteExpense } from "@/hooks/useProjects";
import Header from "@/components/Header";
import KPICard from "@/components/KPICard";
import ProjectSummary from "@/components/ProjectSummary";
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

// === Estilos compartidos de botones (usan variables CSS del tema) ===
const ghostBtn: React.CSSProperties = {
  background: "var(--surface-2)",
  backdropFilter: "blur(8px)",
  border: "1px solid var(--border-default)",
  borderRadius: 10,
  padding: "7px 14px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-secondary)",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "all 0.15s",
};
const ghostBtnHover = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.borderColor = "var(--border-strong)";
  e.currentTarget.style.color = "var(--text-primary)";
  e.currentTarget.style.background = "var(--surface-3)";
};
const ghostBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.borderColor = "var(--border-default)";
  e.currentTarget.style.color = "var(--text-secondary)";
  e.currentTarget.style.background = "var(--surface-2)";
};
const primaryBtn: React.CSSProperties = {
  background: "var(--accent)",
  border: "1px solid var(--accent)",
  borderRadius: 10,
  padding: "7px 16px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--accent-on)",
  boxShadow: "var(--shadow-button)",
  transition: "all 0.15s",
};
const successBtn: React.CSSProperties = {
  background: "var(--success)",
  border: "1px solid var(--success)",
  borderRadius: 10,
  padding: "7px 16px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--accent-on)",
  boxShadow: "var(--shadow-button)",
  transition: "all 0.15s",
};

export default function ProjectPage({ params }: PageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { project, loading, refetch } = useProject(params.id);
  const [activeSection, setActiveSection] = useState("resumen");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddCostModal, setShowAddCostModal] = useState(false);
  const [showRegisterSaleModal, setShowRegisterSaleModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<import("@/types").Expense | null>(null);
  const { mutate: deleteExpense } = useDeleteExpense();
  const [showAddInvestorModal, setShowAddInvestorModal] = useState(false);

  const userRole = session?.user?.role;
  const isAdmin = userRole === "admin";
  const canEdit = userRole === "admin" || userRole === "colaborador";

  // Early returns AFTER all hooks (safe: all useX hooks are above this point)
  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Header />
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-tertiary)" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            border: "3px solid var(--border-default)",
            borderTopColor: "var(--text-primary)",
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
      <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Header />
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-tertiary)" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 16, opacity: 0.3 }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>Proyecto no encontrado</div>
          <button onClick={() => router.push("/")} style={{
            marginTop: 12, padding: "8px 20px", borderRadius: 10,
            border: "1px solid var(--border-default)",
            background: "var(--surface-2)",
            color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            ← Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  // project is non-null from here on
  const p = project;

  const buyPrice = safeNum(p?.buyPrice);
  const totalCosts = safeNum(p?.totalCosts);
  const inv = safeNum(p?.investment);
  const salePrice = safeNum(p?.salePrice);
  const listingPrice = safeNum(p?.listingPrice);
  const hasSale = salePrice > 0;
  const result = hasSale ? safeNum(p?.result) : null;
  const margin = hasSale ? safeNum(p?.margin) : null;
  const estMargin = !hasSale && listingPrice > 0 ? safeNum(p?.estimatedMargin) : null;
  const costRatio = buyPrice > 0 ? (totalCosts / buyPrice) * 100 : 0;
  const buyDateRaw = p?.buyDate ? new Date(p.buyDate) : null;
  const daysActive = buyDateRaw && !isNaN(buyDateRaw.getTime()) ? Math.floor((new Date().getTime() - buyDateRaw.getTime()) / 86400000) : 0;
  const costsArray = Array.isArray(p?.costs) ? p.costs : [];
  const expensesArray = Array.isArray(p?.expenses) ? p.expenses : [];
  const investorsArray = Array.isArray(p?.investors) ? p.investors : [];
  const isInvestor = investorsArray.some((inv: any) => inv.userId === session?.user?.id);

  const totalExpensesUsd = expensesArray.reduce((sum: number, e: any) => sum + (e.amountUsd ?? 0), 0);
  const expenseMonths = new Set(expensesArray.map((e: any) => {
    const d = new Date(e.period);
    return `${d.getFullYear()}-${d.getMonth()}`;
  })).size;
  const avgMonthlyExpense = expenseMonths > 0 ? totalExpensesUsd / expenseMonths : 0;

  const expensesByConcept = (() => {
    const map: Record<string, number> = {};
    expensesArray.forEach((e: any) => {
      const key = e.concept || "Otros";
      map[key] = (map[key] || 0) + (e.amountUsd ?? 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  })();

  const statusStyle = statusConfig[p?.status || "activo"] || statusConfig.activo;

  // === SINGLE RETURN — no early returns to avoid hook order issues ===
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Header />

      {/* Project loaded (loading/not-found handled via early returns above) */}
      <>
      <div className="page-container" style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Breadcrumb + actions */}
        <div className="breadcrumb-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => router.back()}
              style={{
                background: "var(--surface-2)",
                backdropFilter: "blur(8px)",
                border: "1px solid var(--border-default)",
                borderRadius: 10,
                padding: "6px 14px",
                cursor: "pointer",
                fontSize: 13,
                color: "var(--text-secondary)",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-strong)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              ← Volver
            </button>
            <div className="breadcrumb-path" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 20, width: 1, background: "var(--border-default)" }} />
              <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Proyectos</span>
              <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>/</span>
              <span className="truncate" style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500, maxWidth: 240 }}>
                {p.name}
              </span>
            </div>
          </div>
          <div className="breadcrumb-actions" style={{ display: "flex", gap: 8 }}>
            {/* Exportar */}
            {canEdit && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/projects/${params.id}/export`);
                    const json = await res.json();
                    const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
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
                style={ghostBtn}
                onMouseEnter={ghostBtnHover}
                onMouseLeave={ghostBtnLeave}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Exportar</span>
              </button>
            )}
            {/* Compartir */}
            {isAdmin && (
              <button
                onClick={() => setShowShareModal(true)}
                style={ghostBtn}
                onMouseEnter={ghostBtnHover}
                onMouseLeave={ghostBtnLeave}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                <span>Compartir</span>
              </button>
            )}
            {/* + Costo — primary action */}
            {canEdit && (
              <button onClick={() => setShowAddCostModal(true)} style={primaryBtn}>
                + Costo
              </button>
            )}
            {/* + Gasto — secondary outline */}
            {canEdit && (
              <button onClick={() => setShowAddExpenseModal(true)} style={ghostBtn} onMouseEnter={ghostBtnHover} onMouseLeave={ghostBtnLeave}>
                + Gasto
              </button>
            )}
            {/* Venta — success */}
            {canEdit && p.status !== "vendido" && (
              <button onClick={() => setShowRegisterSaleModal(true)} style={successBtn}>
                Venta
              </button>
            )}
          </div>
        </div>

        {/* Project header */}
        <div
          className="glass-card"
          style={{
            padding: "18px 22px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="project-name truncate" style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.4px" }}>
                  {p.name}
                </span>
                <span
                  style={{
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    border: `1px solid ${statusStyle.color}33`,
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
                  color: "var(--text-tertiary)",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text-secondary)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    border: "1px solid var(--border-default)",
                  }}
                >
                  {p.type}
                </span>
                {p.address && <span style={{ color: "var(--text-secondary)" }}>{p.address}</span>}
                <span style={{ color: "var(--text-secondary)" }}>Compra: {new Date(p.buyDate).toLocaleDateString("es-AR")}</span>
                <span style={{ color: "var(--text-secondary)" }}>{daysActive} días activo</span>
                <span style={{ color: "var(--text-secondary)" }}>Actualizado {daysAgo(p.lastUpdate)}</span>
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
              { label: "Compra", value: fmt(buyPrice) },
              {
                label: "Costos",
                value: fmt(totalCosts),
                sub: costRatio > 40 ? `${costRatio.toFixed(0)}% de compra` : undefined,
                subColor: costRatio > 40 ? "var(--warning)" : undefined,
              },
              { label: "Inversión Total", value: fmt(inv), bold: true },
              p.salePrice
                ? { label: "Venta", value: fmt(salePrice) }
                : {
                    label: "Valor publicación",
                    value: p.listingPrice ? fmt(listingPrice) : "—",
                  },
              p.salePrice
                ? {
                    label: "Resultado",
                    value: fmtSign(result!),
                    color: result! >= 0 ? "var(--success)" : "var(--danger)",
                  }
                : {
                    label: "Margen est.",
                    value: estMargin !== null ? fmtPct(estMargin) : "—",
                    color: estMargin !== null ? (estMargin >= 0 ? "var(--success)" : "var(--danger)") : undefined,
                  },
              p.salePrice
                ? {
                    label: "Margen",
                    value: fmtPct(margin!),
                    color: margin! >= 0 ? "var(--success)" : "var(--danger)",
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
          className="section-tabs tabs-scroll"
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 16,
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
                padding: "12px 4px",
                fontSize: 13,
                fontWeight: activeSection === tab.key ? 600 : 500,
                color: activeSection === tab.key ? "var(--text-primary)" : "var(--text-tertiary)",
                background: activeSection === tab.key ? "var(--surface-2)" : "transparent",
                border: "none",
                borderBottom:
                  activeSection === tab.key
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (activeSection !== tab.key) {
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "var(--surface-1)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== tab.key) {
                  e.currentTarget.style.color = "var(--text-tertiary)";
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
          className="section-content glass-card"
          style={{
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
              <ProjectSummary
                projectType={p?.type as "Casa" | "Auto"}
                status={p?.status || "activo"}
                costs={costsArray}
                expenses={expensesArray}
                buyPrice={buyPrice}
                totalCosts={totalCosts}
                totalExpenses={totalExpensesUsd}
                investment={inv}
                salePrice={salePrice}
                listingPrice={listingPrice}
                result={result}
                margin={margin}
                estimatedMargin={estMargin}
                daysActive={daysActive}
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
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    Gastos mensuales
                  </div>
                  {expensesArray.length > 0 && (
                    <button
                      onClick={() => setActiveSection("gastos")}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--border-default)",
                        borderRadius: 8,
                        padding: "4px 12px",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--surface-2)";
                        e.currentTarget.style.borderColor = "var(--border-strong)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "var(--border-default)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }}
                    >
                      Ver detalle →
                    </button>
                  )}
                </div>

                {expensesArray.length === 0 ? (
                  <div style={{
                    background: "var(--surface-1)",
                    borderRadius: 12,
                    border: "1px dashed var(--border-default)",
                    padding: "24px 16px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>
                      Sin gastos mensuales registrados
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => setShowAddExpenseModal(true)}
                        style={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border-default)",
                          borderRadius: 8,
                          padding: "6px 14px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--surface-3)";
                          e.currentTarget.style.borderColor = "var(--border-strong)";
                          e.currentTarget.style.color = "var(--text-primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--surface-2)";
                          e.currentTarget.style.borderColor = "var(--border-default)";
                          e.currentTarget.style.color = "var(--text-secondary)";
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
                      gap: 10,
                      marginBottom: 16,
                    }}>
                      <div style={{
                        background: "var(--surface-1)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        border: "1px solid var(--border-default)",
                        minWidth: 0,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                          Total gastos
                        </div>
                        <div className="tabular truncate" style={{ fontSize: "clamp(14px, 2vw, 18px)", fontWeight: 700, color: "var(--text-primary)" }}>
                          U$D {totalExpensesUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
                          {expenseMonths} {expenseMonths === 1 ? "mes" : "meses"}
                        </div>
                      </div>
                      <div style={{
                        background: "var(--surface-1)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        border: "1px solid var(--border-default)",
                        minWidth: 0,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                          Promedio mensual
                        </div>
                        <div className="tabular truncate" style={{ fontSize: "clamp(14px, 2vw, 18px)", fontWeight: 700, color: "var(--text-primary)" }}>
                          U$D {avgMonthlyExpense.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
                          USD/mes
                        </div>
                      </div>
                      <div style={{
                        background: "var(--surface-1)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        border: "1px solid var(--border-default)",
                        minWidth: 0,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                          Impacto s/ inversión
                        </div>
                        <div className="tabular truncate" style={{ fontSize: "clamp(14px, 2vw, 18px)", fontWeight: 700, color: inv > 0 && (totalExpensesUsd / inv * 100) > 5 ? "var(--warning)" : "var(--text-primary)" }}>
                          {inv > 0 ? `${(totalExpensesUsd / inv * 100).toFixed(1)}%` : "—"}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
                          del total invertido
                        </div>
                      </div>
                    </div>

                    {/* Expense concept breakdown */}
                    {expensesByConcept.length > 0 && (
                      <div style={{
                        background: "var(--surface-1)",
                        borderRadius: 10,
                        border: "1px solid var(--border-faint)",
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
                              gap: 10,
                              borderBottom: i < expensesByConcept.length - 1 && i < 4
                                ? "1px solid var(--border-faint)" : "none",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                <div style={{
                                  width: 6, height: 6, borderRadius: 99,
                                  background: "var(--text-secondary)", flexShrink: 0,
                                  opacity: 1 - (i * 0.15),
                                }} />
                                <span className="truncate" style={{
                                  fontSize: 13, fontWeight: 500, color: "var(--text-primary)",
                                }}>
                                  {concept}
                                </span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                <div style={{
                                  width: 60, height: 4, borderRadius: 2,
                                  background: "var(--surface-3)",
                                  overflow: "hidden",
                                }}>
                                  <div style={{
                                    width: `${pct}%`, height: "100%",
                                    background: "var(--text-primary)",
                                    borderRadius: 2, opacity: 0.6,
                                  }} />
                                </div>
                                <span className="tabular" style={{
                                  fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
                                  minWidth: 80, textAlign: "right",
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
                            color: "var(--text-tertiary)",
                            textAlign: "center",
                            borderTop: "1px solid var(--border-faint)",
                          }}>
                            +{expensesByConcept.length - 5} conceptos más
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* (El "Resumen financiero" tabular se eliminó: ahora vive como KPIs + Comparativos dentro de <ProjectSummary />) */}

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
              onAddClick={() => { setEditingExpense(null); setShowAddExpenseModal(true); }}
              onEditClick={(exp) => { setEditingExpense(exp); setShowAddExpenseModal(true); }}
              onDelete={async (exp) => {
                const label = `${exp.concept} — ${new Date(exp.period).toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "UTC" })}`;
                if (!window.confirm(`¿Eliminar el gasto "${label}"? Esta acción no se puede deshacer.`)) return;
                try {
                  await deleteExpense(params.id, exp.id);
                  refetch();
                } catch (err) {
                  window.alert("No se pudo eliminar el gasto. " + (err instanceof Error ? err.message : ""));
                }
              }}
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
        projectType={p?.type}
        isOpen={showAddCostModal}
        onClose={() => setShowAddCostModal(false)}
        onSuccess={() => refetch()}
      />

      <AddExpenseModal
        projectId={params.id}
        isOpen={showAddExpenseModal}
        onClose={() => { setShowAddExpenseModal(false); setEditingExpense(null); }}
        onSuccess={() => refetch()}
        expenseToEdit={editingExpense}
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
      </>
    </main>
  );
}
