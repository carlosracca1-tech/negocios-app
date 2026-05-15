"use client";

import { useState, useMemo } from "react";
import { Expense } from "@/types";

interface ExpensesPanelProps {
  expenses: Expense[];
  onAddClick: () => void;
  onEditClick?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
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

// Lee el período en UTC: la fecha está guardada como YYYY-MM-01T...Z y queremos
// mostrar siempre el mes calendario sin que el huso horario del cliente lo corra.
function periodKey(period: Date | string): string {
  const d = new Date(period);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatPeriod(period: Date | string): string {
  // Acepta tanto un ISO con hora como un "YYYY-MM" plano.
  if (typeof period === "string" && /^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split("-").map(Number);
    return `${monthNames[m - 1]} ${y}`;
  }
  const d = new Date(period);
  return `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatShortPeriod(period: Date | string): string {
  if (typeof period === "string" && /^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split("-").map(Number);
    return `${monthNames[m - 1].substring(0, 3)} ${String(y).slice(-2)}`;
  }
  const d = new Date(period);
  return `${monthNames[d.getUTCMonth()].substring(0, 3)} ${d.getUTCFullYear().toString().slice(-2)}`;
}

export default function ExpensesPanel({ expenses, onAddClick, onEditClick, onDelete, canEdit = true }: ExpensesPanelProps) {
  const [viewMode, setViewMode] = useState<"table" | "monthly">("monthly");

  // Group by period (month)
  const monthlyData = useMemo(() => {
    const grouped: Record<string, { period: string; expenses: Expense[]; totalArs: number; totalUsd: number }> = {};

    expenses.forEach((exp) => {
      const key = periodKey(exp.period);
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
    const months = new Set(expenses.map((e) => periodKey(e.period))).size;
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
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
          Sin gastos mensuales registrados
        </div>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>
          Agregá gastos recurrentes como expensas, seguro, patente, u otros gastos mensuales del proyecto.
        </p>
        {canEdit && (
          <button
            onClick={onAddClick}
            style={{
              background: "var(--accent)",
              border: "none",
              borderRadius: 10,
              padding: "10px 24px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--accent-on)",
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
          { label: "Mes más alto", value: stats.maxMonth ? fmtUsd(stats.maxMonth.totalUsd) : "—", sub: stats.maxMonth ? formatPeriod(stats.maxMonth.period) : "", color: "var(--danger)" },
          { label: "Mes más bajo", value: stats.minMonth ? fmtUsd(stats.minMonth.totalUsd) : "—", sub: stats.minMonth ? formatPeriod(stats.minMonth.period) : "", color: "var(--success)" },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card" style={{ background: "var(--surface-2)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border-default)" }}>
            <div className="kpi-label" style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{kpi.label}</div>
            <div className="kpi-value" style={{ fontSize: 18, fontWeight: 700, color: kpi.color || "var(--text-primary)" }}>{kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Concepts legend */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {concepts.map((c, i) => (
          <span key={c} style={{
            fontSize: 11, fontWeight: 500, color: "var(--text-secondary)",
            background: "var(--surface-1)", padding: "3px 10px", borderRadius: 6,
            border: "1px solid rgba(56, 189, 248, 0.1)",
          }}>
            {c}
          </span>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 8, padding: 3, border: "1px solid var(--border-default)" }}>
          {(["monthly", "table"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "6px 14px", fontSize: 12, fontWeight: 500, border: "none", borderRadius: 6, cursor: "pointer",
                background: viewMode === mode ? "var(--surface-3)" : "transparent",
                color: viewMode === mode ? "var(--text-primary)" : "var(--text-tertiary)",
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
              background: "var(--accent)",
              border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer",
              fontSize: 12, fontWeight: 600, color: "var(--accent-on)",
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
              background: "var(--surface-1)", borderRadius: 10,
              border: "1px solid var(--border-faint)", overflow: "hidden",
            }}>
              {/* Month header */}
              <div className="month-header" style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", background: "var(--surface-1)",
                borderBottom: "1px solid var(--border-faint)",
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  {formatPeriod(month.period)}
                </div>
                <div className="month-totals" style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {month.totalArs > 0 && (
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{fmt(month.totalArs)}</span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                    {fmtUsd(month.totalUsd)}
                  </span>
                </div>
              </div>
              {/* Items */}
              {month.expenses.map((exp) => (
                <div key={exp.id} className="expense-item" style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 16px", borderBottom: "1px solid var(--border-faint)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 99, background: "var(--text-primary)", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.concept}</div>
                      {exp.notes && <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.notes}</div>}
                    </div>
                  </div>
                  <div className="expense-item-amounts" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    {exp.receiptUrl && (
                      <span style={{ fontSize: 10, color: "var(--success)", background: "var(--success-soft)", padding: "2px 8px", borderRadius: 4 }}>
                        Comprobante
                      </span>
                    )}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                        {exp.currency === "ARS" ? fmt(exp.amount) : fmtUsd(exp.amount)}
                      </div>
                      {exp.currency === "ARS" && exp.amountUsd && (
                        <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{fmtUsd(exp.amountUsd)}</div>
                      )}
                    </div>
                    {canEdit && (onEditClick || onDelete) && (
                      <div style={{ display: "flex", gap: 4 }}>
                        {onEditClick && (
                          <button
                            onClick={() => onEditClick(exp)}
                            title="Editar"
                            aria-label="Editar gasto"
                            style={{
                              background: "transparent", border: "1px solid var(--border-faint)",
                              borderRadius: 6, padding: "4px 8px", cursor: "pointer",
                              fontSize: 12, color: "var(--text-secondary)", lineHeight: 1,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                          >
                            ✎
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(exp)}
                            title="Eliminar"
                            aria-label="Eliminar gasto"
                            style={{
                              background: "transparent", border: "1px solid var(--border-faint)",
                              borderRadius: 6, padding: "4px 8px", cursor: "pointer",
                              fontSize: 12, color: "var(--text-secondary)", lineHeight: 1,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--danger-soft)"; e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "var(--danger-border)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border-faint)"; }}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Table view */}
      {viewMode === "table" && (
        <div className="responsive-table" style={{ borderRadius: 10, border: "1px solid var(--border-faint)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
            <thead>
              <tr style={{ background: "var(--surface-1)" }}>
                <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase" }}>Período</th>
                <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase" }}>Concepto</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 600, color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase" }}>Monto</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 600, color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase" }}>USD</th>
                <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 600, color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase" }}>Comp.</th>
                {canEdit && (onEditClick || onDelete) && (
                  <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 600, color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase", width: 90 }}></th>
                )}
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} style={{ borderTop: "1px solid var(--border-faint)" }}>
                  <td style={{ padding: "10px 14px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {formatShortPeriod(exp.period)}
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--text-primary)", fontWeight: 500 }}>{exp.concept}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {exp.currency === "ARS" ? fmt(exp.amount) : fmtUsd(exp.amount)}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                    {exp.amountUsd ? fmtUsd(exp.amountUsd) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    {exp.receiptUrl ? (
                      <span style={{ fontSize: 10, color: "var(--success)", background: "var(--success-soft)", padding: "2px 8px", borderRadius: 4 }}>✓</span>
                    ) : (
                      <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>—</span>
                    )}
                  </td>
                  {canEdit && (onEditClick || onDelete) && (
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        {onEditClick && (
                          <button onClick={() => onEditClick(exp)} title="Editar" aria-label="Editar gasto" style={{ background: "transparent", border: "1px solid var(--border-faint)", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontSize: 11, color: "var(--text-secondary)" }}>✎</button>
                        )}
                        {onDelete && (
                          <button onClick={() => onDelete(exp)} title="Eliminar" aria-label="Eliminar gasto" style={{ background: "transparent", border: "1px solid var(--border-faint)", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontSize: 11, color: "var(--text-secondary)" }}>🗑</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
