"use client";

import { Investor } from "@/types";

interface CapitalPanelProps {
  investors: Investor[];
  totalInvested: number;
}

export default function CapitalPanel({ investors, totalInvested }: CapitalPanelProps) {
  const fmt = (n: number) => (n == null ? "—" : "$" + Math.abs(n).toLocaleString("en-US"));

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 20 }}>
        Inversores ({investors.length})
      </div>

      {investors.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "#999" }}>
          Sin inversores registrados
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {investors.map((investor) => {
            const amount = (investor.percentage / 100) * totalInvested;
            return (
              <div
                key={investor.id}
                style={{
                  background: "#FAFBFC",
                  borderRadius: 8,
                  border: "1px solid #f0f0f0",
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
                      {investor.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                      {investor.percentage.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>
                    {fmt(amount)}
                  </div>
                </div>

                {/* Percentage bar */}
                <div style={{ height: 6, background: "#e0e0e0", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${investor.percentage}%`,
                      background: "#2E75B6",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Total */}
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              border: "1px solid #e0e0e0",
              padding: "12px 14px",
              marginTop: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "#666" }}>Total</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>
              {fmt(totalInvested)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
