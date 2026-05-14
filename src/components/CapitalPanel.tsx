"use client";

import { Investor } from "@/types";
import { fmt } from "@/lib/format";

interface CapitalPanelProps {
  investors: Investor[];
  totalInvested: number;
  compact?: boolean;
  isAdmin?: boolean;
  projectId?: string;
  saleResult?: number | null;
  onAddInvestor?: () => void;
  onRefetch?: () => void;
}

export default function CapitalPanel({
  investors,
  totalInvested,
  compact = false,
  isAdmin = false,
  projectId,
  saleResult,
  onAddInvestor,
  onRefetch,
}: CapitalPanelProps) {
  const totalCapital = investors.reduce((sum, inv) => sum + (inv.capitalPercentage || 0), 0);
  const totalProfit = investors.reduce((sum, inv) => sum + (inv.profitPercentage || 0), 0);
  const unallocatedCapital = 100 - totalCapital;

  if (investors.length === 0) {
    if (compact) return null;
    return (
      <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-tertiary)" }}>
        Sin inversores registrados
        {isAdmin && (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={onAddInvestor}
              style={{
                padding: "8px 16px",
                background: "var(--accent)",
                color: "var(--accent-on)",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(56, 189, 248, 0.35)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              Agregar inversor
            </button>
          </div>
        )}
      </div>
    );
  }

  // Compact view for sidebar/resumen
  if (compact) {
    return (
      <div
        style={{
          background: "var(--surface-1)",
          borderRadius: 12,
          border: "1px solid var(--border-faint)",
          padding: "16px 18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Capital</div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            {investors.length} inversor{investors.length !== 1 ? "es" : ""}
          </div>
        </div>

        {/* Stacked bar for capital */}
        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 2, marginBottom: 12 }}>
          {investors.map((inv, i) => {
            const pct = inv.capitalPercentage || 0;
            return (
              <div
                key={inv.id}
                style={{
                  width: `${pct}%`,
                  minWidth: 4,
                  background: barColors[i % barColors.length],
                  borderRadius: 2,
                  transition: "width 0.3s",
                }}
              />
            );
          })}
          {unallocatedCapital > 0 && (
            <div style={{ width: `${unallocatedCapital}%`, background: "var(--surface-1)", borderRadius: 2 }} />
          )}
        </div>

        {/* Investor list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {investors.map((inv, i) => {
            const pct = inv.capitalPercentage || 0;
            const amount = (pct / 100) * (totalInvested || 0);
            return (
              <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: barColors[i % barColors.length],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{inv.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{pct.toFixed(0)}%</span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmt(amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full view for Capital tab
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Inversores ({investors.length})
        </div>
        {isAdmin && onAddInvestor && (
          <button
            onClick={onAddInvestor}
            style={{
              padding: "8px 16px",
              background: "var(--accent)",
              color: "var(--accent-on)",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(56, 189, 248, 0.35)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            + Agregar inversor
          </button>
        )}
      </div>

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid var(--border-default)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Total invertido
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{fmt(totalInvested)}</div>
        </div>
        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid var(--border-default)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Capital asignado
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: totalCapital >= 100 ? "var(--success)" : "var(--warning)" }}>
            {totalCapital.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
            {fmt((totalCapital / 100) * totalInvested)}
          </div>
        </div>
        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid var(--border-default)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Dividendos asignados
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: totalProfit >= 100 ? "var(--success)" : "var(--warning)" }}>
            {totalProfit.toFixed(1)}%
          </div>
        </div>
        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid var(--border-default)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Sin asignar
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: unallocatedCapital > 0 ? "var(--warning)" : "var(--success)" }}>
            {unallocatedCapital > 0 ? `${unallocatedCapital.toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>

      {/* Capital stacked bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Capital (%)</div>
        <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", gap: 2 }}>
          {investors.map((inv, i) => {
            const pct = inv.capitalPercentage || 0;
            return (
              <div
                key={inv.id}
                style={{
                  width: `${pct}%`,
                  minWidth: 4,
                  background: barColors[i % barColors.length],
                  borderRadius: 3,
                  transition: "width 0.3s",
                }}
                title={`${inv.name}: ${pct}%`}
              />
            );
          })}
          {unallocatedCapital > 0 && (
            <div
              style={{ width: `${unallocatedCapital}%`, background: "var(--surface-1)", borderRadius: 3 }}
              title={`Sin asignar: ${unallocatedCapital.toFixed(1)}%`}
            />
          )}
        </div>
      </div>

      {/* Profit stacked bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Ganancia (%)</div>
        <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", gap: 2 }}>
          {investors.map((inv, i) => {
            const pct = inv.profitPercentage || 0;
            return (
              <div
                key={inv.id}
                style={{
                  width: `${pct}%`,
                  minWidth: 4,
                  background: barColors[i % barColors.length],
                  borderRadius: 3,
                  transition: "width 0.3s",
                }}
                title={`${inv.name}: ${pct}%`}
              />
            );
          })}
          {100 - totalProfit > 0 && (
            <div
              style={{
                width: `${100 - totalProfit}%`,
                background: "var(--surface-1)",
                borderRadius: 3,
              }}
              title={`Sin asignar: ${(100 - totalProfit).toFixed(1)}%`}
            />
          )}
        </div>
      </div>

      {/* Investor cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
        {investors.map((investor, i) => {
          const capitalAmount = (investor.capitalPercentage / 100) * (totalInvested || 0);
          return (
            <div
              key={investor.id}
              style={{
                background: "var(--surface-1)",
                borderRadius: 12,
                border: "1px solid var(--border-faint)",
                padding: "14px 16px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--surface-3)";
                e.currentTarget.style.background = "var(--surface-1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--surface-1)";
                e.currentTarget.style.background = "var(--surface-1)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{investor.name}</div>
                  {investor.user && (
                    <div style={{ fontSize: 11, color: "var(--text-primary)", marginTop: 2 }}>{investor.user.email}</div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Monto aportado</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{fmt(investor.amountInvested || 0)}</div>
                </div>
              </div>

              {/* Capital info */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Capital: {investor.capitalPercentage.toFixed(1)}% ({fmt(capitalAmount)} USD)
                  </span>
                </div>
                <div style={{ height: 6, background: "var(--surface-1)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${investor.capitalPercentage}%`,
                      background: barColors[i % barColors.length],
                      transition: "width 0.3s",
                      borderRadius: 3,
                      boxShadow: `0 0 8px ${barColors[i % barColors.length]}33`,
                    }}
                  />
                </div>
              </div>

              {/* Profit info */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Ganancia: {investor.profitPercentage.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: 6, background: "var(--surface-1)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${investor.profitPercentage}%`,
                      background: barColors[i % barColors.length],
                      transition: "width 0.3s",
                      borderRadius: 3,
                      boxShadow: `0 0 8px ${barColors[i % barColors.length]}33`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total row */}
      <div
        style={{
          background: "var(--surface-1)",
          borderRadius: 10,
          border: "1px solid var(--border-default)",
          padding: "14px 16px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Total invertido</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{fmt(totalInvested)}</div>
      </div>

      {/* Dividend distribution section (only when project is vendido and has saleResult) */}
      {saleResult !== undefined && saleResult !== null && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--success)", marginBottom: 16 }}>
            Distribución de dividendos
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {investors.map((investor, i) => {
              const profitShare = (investor.profitPercentage / 100) * saleResult;
              return (
                <div
                  key={investor.id}
                  style={{
                    background: "var(--success-soft)",
                    borderRadius: 10,
                    border: "1px solid var(--success-soft)",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{investor.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>{fmt(profitShare)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const barColors = [
  "var(--text-primary)",
  "var(--text-primary)",
  "var(--success)",
  "var(--text-secondary)",
  "var(--warning)",
  "var(--danger)",
  "var(--text-secondary)",
];
