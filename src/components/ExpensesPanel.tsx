"use client";

import { useState, useMemo } from "react";
import { Expense } from "@/types";

interface ExpensesPanelProps {
  expenses: Expense[];
  onAddClick: () => void;
  canEdit?: boolean;
}

const fmt = (n: number) =>
  `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtUsd = (n: number) =>
  `U$D ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatPeriod(period: Date | string): string {
  const d = new Date(period);
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShortPeriod(period: Date | string): string {
  const d = new Date(period);
  return `${monthNames[d.getMonth()].substring(0, 3)} ${d.getFullYear().toString().slice(-2)}`;
}

export default function ExpensesPanel({ expenses, onAddClick, canEdit = true }: ExpensesPanelProps) {
  const [viewMode, setViewMode] = useState<"table" | "monthly">("monthly");

  // Group by period (month)
  const monthlyData = useMemo(() => {
    const grouped: Record<string, { period: string; expenses: Expense[]; totalArs: number; totalUsd: number }> = {};

    expenses.forEach((exp) => {
      const d = new Date(exp.period);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!grouped[key]) {
        grouped[key] = { period: key, expenses: [], totalArs: 0, totalUsd: 0 };
      }
      grouped[key].expenses.push(exp);
      grouped[key].totalArs += exp.currency === "ARS" ? exp.amount : 0;
      grouped[key].totalUsd += exp.amountUsd ?? 0;
    });

    return Object.values(grouped).sort((a, b) => b.period.localeCompare(a.period));
  }, [expenses]);

  // Summary stats
  const stats = useMemo(() => {
    const totalUsd = expenses.reduce((sum, e) => sum + (e.amountUsd ?? 0), 0);
    const totalArs = expenses.reduce((sum, e) => sum + (e.currency === "ARS" ? e.amount : 0), 0);
    const months = new Set(expenses.map((e) => {
      const d = new Date(e.period);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })).size;
    const avgUsd = months > 0 ? totalUsd / months : 0;
    const maxMonth = monthlyData.length > 0
      ? monthlyData.reduce((max, m) => m.totalUsd > max.totalUsd ? m : max)
      : null;
    const minMonth = monthlyData.length > 0
      ? monthlyData.reduce((min, m) => m.totalUsd < min.totalUsd ? m : min)
      : null;
    return { totalUsd, totalArs, months, avgUsd, maxMonth, minMonth };
  }, [expenses, monthlyData]);

  // Unique concepts for legend
  const concepts = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(e.concept));
    return Array.from(set);
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📋</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#e8edf5", marginBottom: 8 }}>
          Sin gastos mensuales registrados
        </div>
        <p style={{ fontSize: 13, color: "#5a6b82", marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>
          Agregá gastos recurrentes como expensas, seguro, patente, u otros gastos mensuales del proyecto.
        </p>
        {canEdit && (
          <button
            onClick={onAddClick}
            style={{
              background: "linear-gradient(135deg, #38bdf8, #7dd3fc)",
              border: "none",
              borderRadius: 10,
              padding: "10px 24px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "#060b14",
              boxShadow: "0 2px 12px rgba(56, 189, 248, 0.2)",
            }}
          >
            + Agregar gasto mensual
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total USD", value: fmtUsd(stats.totalUsd), sub: `${stats.months} meses` },
          { label: "Promedio mensual", value: fmtUsd(stats.avgUsd), sub: "USD/mes" },
          { label: "Mes más alto", value: stats.maxMonth ? fmtUsd(stats.maxMonth.totalUsd) : "—", sub: stats.maxMonth ? formatPeriod(stats.maxMonth.period + "-01") : "", color: "#f87171" },
          { label: "Mes más bajo", value: stats.minMonth ? fmtUsd(stats.minMonth.totalUsd) : "—", sub: stats.minMonth ? formatPeriod(stats.minMonth.period + "-01") : "", color: "#34d399" },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card" style={{ background: "rgba(6, 11, 20, 0.6)", borderRadius: 10, padding: "14px 16px", border: "1px solid rgba(56, 189, 248, 0.08)" }}>
            <div className="kpi-label" style={{ fontSize: 10, fontWeight: 600, color: "#5a6b82", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{kpi.label}</div>
            <div className="kpi-value" style={{ fontSize: 18, fontWeight: 700, color: kpi.color || "#e8edf5" }}>{kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: 11, color: "#5a6b82", marginTop: 2 }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Concepts legend */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {concepts.map((c, i) => (
          <span key={c} style={{
            fontSize: 11, fontWeight: 500, color: "#8899b0",
            background: "rgba(56, 189, 248, 0.06)", padding: "3px 10px", borderRadius: 6,
            border: "1px solid rgba(56, 189, 248, 0.1)",
          }}>
            {c}
          </span>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 4, background: "rgba(6, 11, 20, 0.6)", borderRadius: 8, padding: 3, border: "1px solid rgba(56, 189, 248, 0.08)" }}>
          {(["monthly", "table"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "6px 14px", fontSize: 12, fontWeight: 500, border: "none", borderRadius: 6, cursor: "pointer",
                background: viewMode === mode ? "rgba(56, 189, 248, 0.12)" : "transparent",
                color: viewMode === mode ? "#7dd3fc" : "#5a6b82",
                transition: "all 0.2s",
              }}
            >
              {mode === "monthly" ? "Por mes" : "Todos"}
            </button>
          ))}
        </div>
        {canEdit && (
          <button
            onClick={onAddClick}
            style={{
              background: "linear-gradient(135deg, #38bdf8, #7dd3fc)",
              border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer",
              fontSize: 12, fontWeight: 600, color: "#060b14",
              boxShadow: "0 2px 12px rgba(56, 189, 248, 0.2)",
            }}
          >
            + Agregar
          </button>
        )}
      </div>

      {/* Monthly view */}
      {viewMode === "monthly" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {monthlyData.map((month) => (
            <div key={month.period} style={{
              background: "rgba(6, 11, 20, 0.4)", borderRadius: 10,
              border: "1px solid rgba(56, 189, 248, 0.06)", overflow: "hidden",
            }}>
              {/* Month header */}
              <div className="month-header" style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", background: "rgba(56, 189, 248, 0.04)",
                borderBottom: "1px solid rgba(56, 189, 248, 0.06)",
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e8edf5" }}>
                  {formatPeriod(month.period + "-01")}
                </div>
                <div className="month-totals" style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {month.totalArs > 0 && (
                    <span style={{ fontSize: 12, color: "#8899b0" }}>{fmt(month.totalArs)}</span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#7dd3fc" }}>
                    {fmtUsd(month.totalUsd)}
                  </span>
                </div>
              </div>
              {/* Items */}
              {month.expenses.map((exp) => (
                <div key={exp.id} className="expense-item" style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 16px", borderBottom: "1px solid rgba(56, 189, 248, 0.03)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 99, background: "#38bdf8", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#e8edf5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.concept}</div>
                      {exp.notes && <div style={{ fontSize: 11, color: "#5a6b82", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.notes}</div>}
                    </div>
                  </div>
                  <div className="expense-item-amounts" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    {exp.receiptUrl && (
                      <span style={{ fontSize: 10, color: "#34d399", background: "rgba(52, 211, 153, 0.1)", padding: "2px 8px", borderRadius: 4 }}>
                        Comprobante
                      </span>
                    )}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e8edf5", fontVariantNumeric: "tabular-nums" }}>
                        {exp.currency === "ARS" ? fmt(exp.amount) : fmtUsd(exp.amount)}
                      </div>
                      {exp.currency === "ARS" && exp.amountUsd && (
                        <div style={{ fontSize: 10, color: "#5a6b82" }}>{fmtUsd(exp.amountUsd)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Table view */}
      {viewMode === "table" && (
        <div className="responsive-table" style={{ borderRadius: 10, border: "1px solid rgba(56, 189, 248, 0.06)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
            <thead>
              <tr style={{ background: "rgba(56, 189, 248, 0.04)" }}>
                <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "#5a6b82", fontSize: 11, textTransform: "uppercase" }}>Período</th>
                <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "#5a6b82", fontSize: 11, textTransform: "uppercase" }}>Concepto</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 600, color: "#5a6b82", fontSize: 11, textTransform: "uppercase" }}>Monto</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 600, color: "#5a6b82", fontSize: 11, textTransform: "uppercase" }}>USD</th>
                <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 600, color: "#5a6b82", fontSize: 11, textTransform: "uppercase" }}>Comp.</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} style={{ borderTop: "1px solid rgba(56, 189, 248, 0.04)" }}>
                  <td style={{ padding: "10px 14px", color: "#8899b0", whiteSpace: "nowrap" }}>
                    {formatShortPeriod(exp.period)}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#e8edf5", fontWeight: 500 }}>{exp.concept}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#e8edf5", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {exp.currency === "ARS" ? fmt(exp.amount) : fmtUsd(exp.amount)}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#7dd3fc", fontVariantNumeric: "tabular-nums" }}>
                    {exp.amountUsd ? fmtUsd(exp.amountUsd) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    {exp.receiptUrl ? (
                      <span style={{ fontSize: 10, color: "#34d399", background: "rgba(52, 211, 153, 0.1)", padding: "2px 8px", borderRadius: 4 }}>✓</span>
                    ) : (
                      <span style={{ fontSize: 10, color: "#5a6b82" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
