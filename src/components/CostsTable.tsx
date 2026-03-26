"use client";

import { Cost } from "@/types";

interface CostsTableProps {
  costs: Cost[];
  onAddClick: () => void;
}

export default function CostsTable({ costs, onAddClick }: CostsTableProps) {
  const fmt = (n: number) => (n == null ? "—" : "$" + Math.abs(n).toLocaleString("en-US"));

  const catColors: Record<string, string> = {
    Obra: "#2E75B6",
    Mecánica: "#E65100",
    Estética: "#7B1FA2",
    Profesionales: "#00838F",
    Servicios: "#558B2F",
  };

  const sortedCosts = [...costs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>Costos ({costs.length})</div>
        <button
          onClick={onAddClick}
          style={{
            background: "#1B3A5C",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          + Agregar
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
              <th style={{ textAlign: "left", padding: "10px 0", color: "#999", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Fecha
              </th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "#999", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Concepto
              </th>
              <th style={{ textAlign: "center", padding: "10px 12px", color: "#999", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Categoría
              </th>
              <th style={{ textAlign: "center", padding: "10px 12px", color: "#999", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Tipo
              </th>
              <th style={{ textAlign: "right", padding: "10px 0", color: "#999", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Monto
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCosts.map((cost) => (
              <tr key={cost.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "12px 0", color: "#666" }}>
                  {new Date(cost.date).toLocaleDateString("es-AR")}
                </td>
                <td style={{ padding: "12px 12px", color: "#1a1a1a", fontWeight: 500 }}>
                  {cost.concept}
                </td>
                <td style={{ padding: "12px 12px", textAlign: "center" }}>
                  <span
                    style={{
                      background: catColors[cost.category] + "20",
                      color: catColors[cost.category],
                      padding: "3px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {cost.category}
                  </span>
                </td>
                <td style={{ padding: "12px 12px", textAlign: "center", color: "#666", fontSize: 12 }}>
                  {cost.costType === "material" ? "Material" : "Mano obra"}
                </td>
                <td style={{ padding: "12px 0", textAlign: "right", color: "#1a1a1a", fontWeight: 600 }}>
                  {fmt(cost.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {costs.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "#999" }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>Sin costos registrados</div>
          <button
            onClick={onAddClick}
            style={{
              background: "#E3F2FD",
              border: "1px solid #BBDEFB",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: "#1565C0",
              cursor: "pointer",
            }}
          >
            + Agregar primer costo
          </button>
        </div>
      )}
    </div>
  );
}
