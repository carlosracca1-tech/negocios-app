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
      <div style={{ textAlign: "center", padding: "32px 16px", color: "#5a6b82" }}>
        Sin inversores registrados
        {isAdmin && (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={onAddInvestor}
              style={{
                padding: "8px 16px",
                background: "linear-gradient(135deg, #38bdf8, #7dd3fc)",
                color: "#060b14",
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
          background: "rgba(6, 11, 20, 0.4)",
          borderRadius: 12,
          border: "1px solid rgba(56, 189, 248, 0.06)",
          padding: "16px 18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e8edf5" }}>Capital</div>
          <div style={{ fontSize: 12, color: "#5a6b82" }}>
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
            <div style={{ width: `${unallocatedCapital}%`, background: "rgba(56, 189, 248, 0.06)", borderRadius: 2 }} />
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
                  <span style={{ fontSize: 12, color: "#e8edf5", fontWeight: 500 }}>{inv.name}</span>
                  <span style={{ fontSize: 11, color: "#5a6b82" }}>{pct.toFixed(0)}%</span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#e8d5b7",
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
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e8edf5" }}>
          Inversores ({investors.length})
        </div>
        {isAdmin && onAddInvestor && (
          <button
            onClick={onAddInvestor}
            style={{
              padding: "8px 16px",
              background: "linear-gradient(135deg, #38bdf8, #7dd3fc)",
              color: "#060b14",
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
            background: "rgba(6, 11, 20, 0.6)",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid rgba(56, 189, 248, 0.08)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#5a6b82",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Total invertido
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#e8edf5" }}>{fmt(totalInvested)}</div>
        </div>
        <div
          style={{
            background: "rgba(6, 11, 20, 0.6)",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid rgba(56, 189, 248, 0.08)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#5a6b82",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Capital asignado
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: totalCapital >= 100 ? "#34d399" : "#fbbf24" }}>
            {totalCapital.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: "#5a6b82", marginTop: 2 }}>
            {fmt((totalCapital / 100) * totalInvested)}
          </div>
        </div>
        <div
          style={{
            background: "rgba(6, 11, 20, 0.6)",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid rgba(56, 189, 248, 0.08)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#5a6b82",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Dividendos asignados
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: totalProfit >= 100 ? "#34d399" : "#fbbf24" }}>
            {totalProfit.toFixed(1)}%
          </div>
        </div>
        <div
          style={{
            background: "rgba(6, 11, 20, 0.6)",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid rgba(56, 189, 248, 0.08)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#5a6b82",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Sin asignar
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: unallocatedCapital > 0 ? "#fbbf24" : "#34d399" }}>
            {unallocatedCapital > 0 ? `${unallocatedCapital.toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>

      {/* Capital stacked bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#8899b0", marginBottom: 6 }}>Capital (%)</div>
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
              style={{ width: `${unallocatedCapital}%`, background: "rgba(56, 189, 248, 0.06)", borderRadius: 3 }}
              title={`Sin asignar: ${unallocatedCapital.toFixed(1)}%`}
            />
          )}
        </div>
      </div>

      {/* Profit stacked bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#8899b0", marginBottom: 6 }}>Ganancia (%)</div>
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
                background: "rgba(56, 189, 248, 0.06)",
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
                background: "rgba(6, 11, 20, 0.5)",
                borderRadius: 12,
                border: "1px solid rgba(56, 189, 248, 0.06)",
                padding: "14px 16px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.12)";
                e.currentTarget.style.background = "rgba(12, 21, 36, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.06)";
                e.currentTarget.style.background = "rgba(6, 11, 20, 0.5)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8edf5" }}>{investor.name}</div>
                  {investor.user && (
                    <div style={{ fontSize: 11, color: "#7dd3fc", marginTop: 2 }}>{investor.user.email}</div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#5a6b82", marginBottom: 4 }}>Monto aportado</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7" }}>{fmt(investor.amountInvested || 0)}</div>
                </div>
              </div>

              {/* Capital info */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "#8899b0" }}>
                    Capital: {investor.capitalPercentage.toFixed(1)}% ({fmt(capitalAmount)} USD)
                  </span>
                </div>
                <div style={{ height: 6, background: "rgba(56, 189, 248, 0.06)", borderRadius: 3, overflow: "hidden" }}>
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
                  <span style={{ fontSize: 12, color: "#8899b0" }}>
                    Ganancia: {investor.profitPercentage.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: 6, background: "rgba(56, 189, 248, 0.06)", borderRadius: 3, overflow: "hidden" }}>
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
          background: "rgba(56, 189, 248, 0.04)",
          borderRadius: 10,
          border: "1px solid rgba(56, 189, 248, 0.08)",
          padding: "14px 16px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "#8899b0" }}>Total invertido</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e8edf5" }}>{fmt(totalInvested)}</div>
      </div>

      {/* Dividend distribution section (only when project is vendido and has saleResult) */}
      {saleResult !== undefined && saleResult !== null && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#34d399", marginBottom: 16 }}>
            Distribución de dividendos
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {investors.map((investor, i) => {
              const profitShare = (investor.profitPercentage / 100) * saleResult;
              return (
                <div
                  key={investor.id}
                  style={{
                    background: "rgba(52, 211, 153, 0.04)",
                    borderRadius: 10,
                    border: "1px solid rgba(52, 211, 153, 0.1)",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#e8edf5", fontWeight: 500 }}>{investor.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#34d399" }}>{fmt(profitShare)}</span>
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
  "#38bdf8",
  "#e8d5b7",
  "#34d399",
  "#c084fc",
  "#fbbf24",
  "#f87171",
  "#818cf8",
];
