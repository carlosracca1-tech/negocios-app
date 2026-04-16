"use client";

import { Cost } from "@/types";
import { useMemo } from "react";
import { fmt } from "@/lib/format";
import { catColors } from "@/lib/constants";

interface CostBreakdownProps {
  costs: Cost[];
  projectType: "Casa" | "Auto";
  totalCosts: number;
}

export default function CostBreakdown({ costs, projectType, totalCosts }: CostBreakdownProps) {

  const materialLabel = projectType === "Auto" ? "Repuestos" : "Materiales";

  const costsByCategory = useMemo(() => {
    const map: Record<string, { total: number; material: number; labor: number }> = {};
    costs.forEach((c) => {
      if (!map[c.category]) map[c.category] = { total: 0, material: 0, labor: 0 };
      map[c.category].total += c.amount;
      if (c.costType === "material") map[c.category].material += c.amount;
      else map[c.category].labor += c.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [costs]);

  const globalMaterialTotal = useMemo(() => costs.reduce((s, c) => s + (c.costType === "material" ? c.amount : 0), 0), [costs]);
  const globalLaborTotal = useMemo(() => costs.reduce((s, c) => s + (c.costType !== "material" ? c.amount : 0), 0), [costs]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e8edf5" }}>Desglose de costos</div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#5a6b82" }}>
          <span>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#38bdf8", marginRight: 4, verticalAlign: "middle", boxShadow: "0 0 4px rgba(56, 189, 248, 0.3)" }} />
            {materialLabel}
          </span>
          <span>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#d4a574", marginRight: 4, verticalAlign: "middle", boxShadow: "0 0 4px rgba(212, 165, 116, 0.3)" }} />
            Mano de obra
          </span>
        </div>
      </div>

      {costsByCategory.map(([cat, data], i) => {
        const catPct = totalCosts > 0 ? (data.total / totalCosts) * 100 : 0;
        const matPct = data.total > 0 ? (data.material / data.total) * 100 : 0;
        const labPct = data.total > 0 ? (data.labor / data.total) * 100 : 0;
        return (
          <div key={i} className="cost-breakdown-item" style={{
            marginBottom: 12,
            padding: "12px 14px",
            background: "rgba(6, 11, 20, 0.5)",
            borderRadius: 12,
            border: "1px solid rgba(56, 189, 248, 0.06)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.12)";
            e.currentTarget.style.background = "rgba(12, 21, 36, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.06)";
            e.currentTarget.style.background = "rgba(6, 11, 20, 0.5)";
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: catColors[cat] || "#8899b0",
                  display: "inline-block",
                  boxShadow: `0 0 6px ${(catColors[cat] || "#8899b0")}40`,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e8edf5" }}>{cat}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#e8edf5" }}>
                {fmt(data.total)} <span style={{ color: "#5a6b82", fontWeight: 400, fontSize: 11 }}>({catPct.toFixed(0)}%)</span>
              </span>
            </div>
            <div style={{ height: 5, background: "rgba(56, 189, 248, 0.06)", borderRadius: 3, overflow: "hidden", display: "flex", marginBottom: 8 }}>
              {data.material > 0 && <div style={{ height: "100%", width: `${matPct}%`, background: "linear-gradient(90deg, #38bdf8, #7dd3fc)", transition: "width 0.4s", borderRadius: 3 }} />}
              {data.labor > 0 && <div style={{ height: "100%", width: `${labPct}%`, background: "linear-gradient(90deg, #d4a574, #e8d5b7)", transition: "width 0.4s", borderRadius: 3 }} />}
            </div>
            <div className="cost-breakdown-amounts" style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap" }}>
              {data.material > 0 && (
                <span style={{ color: "#8899b0" }}>
                  {materialLabel}: <span style={{ fontWeight: 600, color: "#7dd3fc" }}>{fmt(data.material)}</span>
                </span>
              )}
              {data.labor > 0 && (
                <span style={{ color: "#8899b0" }}>
                  Mano de obra: <span style={{ fontWeight: 600, color: "#e8d5b7" }}>{fmt(data.labor)}</span>
                </span>
              )}
            </div>
          </div>
        );
      })}

      {costsByCategory.length > 1 && (
        <div style={{
          marginTop: 8,
          padding: "10px 14px",
          background: "rgba(56, 189, 248, 0.04)",
          borderRadius: 12,
          border: "1px solid rgba(56, 189, 248, 0.08)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#5a6b82", flexWrap: "wrap", gap: 4 }}>
            <span>Total general</span>
            <span style={{ color: "#e8edf5", fontSize: 13 }}>{fmt(totalCosts)}</span>
          </div>
          <div className="cost-breakdown-amounts" style={{ display: "flex", gap: 16, fontSize: 12, color: "#5a6b82", flexWrap: "wrap" }}>
            <span>
              {materialLabel}: <span style={{ fontWeight: 600, color: "#38bdf8" }}>{fmt(globalMaterialTotal)}</span>
            </span>
            <span>
              Mano de obra: <span style={{ fontWeight: 600, color: "#d4a574" }}>{fmt(globalLaborTotal)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
