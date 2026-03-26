"use client";

import { Cost } from "@/types";
import { useMemo } from "react";

interface CostBreakdownProps {
  costs: Cost[];
  projectType: "Casa" | "Auto";
  totalCosts: number;
}

export default function CostBreakdown({ costs, projectType, totalCosts }: CostBreakdownProps) {
  const fmt = (n: number) => (n == null ? "—" : "$" + Math.abs(n).toLocaleString("en-US"));

  const catColors: Record<string, string> = {
    Obra: "#2E75B6",
    Mecánica: "#E65100",
    Estética: "#7B1FA2",
    Profesionales: "#00838F",
    Servicios: "#558B2F",
  };

  const materialLabel = projectType === "Auto" ? "Repuestos" : "Materiales";

  // cost breakdown by category with material/labor sub-breakdown
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>Desglose de costos</div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#888" }}>
          <span>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#2E75B6", marginRight: 4, verticalAlign: "middle" }} />
            {materialLabel}
          </span>
          <span>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#E65100", marginRight: 4, verticalAlign: "middle" }} />
            Mano de obra
          </span>
        </div>
      </div>

      {costsByCategory.map(([cat, data], i) => {
        const catPct = (data.total / totalCosts) * 100;
        const matPct = data.total > 0 ? (data.material / data.total) * 100 : 0;
        const labPct = data.total > 0 ? (data.labor / data.total) * 100 : 0;
        return (
          <div key={i} style={{ marginBottom: 16, padding: "12px 14px", background: "#FAFBFC", borderRadius: 8, border: "1px solid #f0f0f0" }}>
            {/* Category header */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: catColors[cat] || "#888", display: "inline-block" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{cat}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                {fmt(data.total)} <span style={{ color: "#999", fontWeight: 400, fontSize: 11 }}>({catPct.toFixed(0)}%)</span>
              </span>
            </div>
            {/* Stacked bar: material + labor */}
            <div style={{ height: 8, background: "#eee", borderRadius: 4, overflow: "hidden", display: "flex", marginBottom: 8 }}>
              {data.material > 0 && <div style={{ height: "100%", width: `${matPct}%`, background: "#2E75B6", transition: "width 0.4s" }} />}
              {data.labor > 0 && <div style={{ height: "100%", width: `${labPct}%`, background: "#E65100", transition: "width 0.4s" }} />}
            </div>
            {/* Sub-items */}
            <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
              {data.material > 0 && (
                <span style={{ color: "#555" }}>
                  {materialLabel}: <span style={{ fontWeight: 600 }}>{fmt(data.material)}</span>
                </span>
              )}
              {data.labor > 0 && (
                <span style={{ color: "#555" }}>
                  Mano de obra: <span style={{ fontWeight: 600 }}>{fmt(data.labor)}</span>
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Global totals bar */}
      {costsByCategory.length > 1 && (
        <div style={{ marginTop: 8, padding: "10px 14px", background: "#fff", borderRadius: 8, border: "1px solid #e8e8e8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#555" }}>
            <span>Total general</span>
            <span style={{ color: "#1a1a1a", fontSize: 13 }}>{fmt(totalCosts)}</span>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#888" }}>
            <span>
              {materialLabel}: <span style={{ fontWeight: 600, color: "#2E75B6" }}>{fmt(globalMaterialTotal)}</span>
            </span>
            <span>
              Mano de obra: <span style={{ fontWeight: 600, color: "#E65100" }}>{fmt(globalLaborTotal)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
