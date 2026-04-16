"use client";

import { Cost } from "@/types";
import { useState, useMemo } from "react";
import { fmt } from "@/lib/format";
import { catColors } from "@/lib/constants";

const costTypeLabels: Record<string, string> = {
  material: "Mat",
  mano_de_obra: "MO",
  servicio: "Serv",
  tramite: "Trám",
  repuesto: "Rep",
};

const costTypeFullLabels: Record<string, string> = {
  material: "Material",
  mano_de_obra: "Mano de obra",
  servicio: "Servicio",
  tramite: "Trámite",
  repuesto: "Repuesto",
};

interface CostsTableProps {
  costs: Cost[];
  onAddClick: () => void;
  canEdit?: boolean;
}

export default function CostsTable({ costs, onAddClick, canEdit = true }: CostsTableProps) {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Extract unique categories from actual costs
  const uniqueCategories = useMemo(() => {
    const cats = new Set(costs.map((c) => c.category));
    return Array.from(cats).sort();
  }, [costs]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(costs.map((c) => c.costType));
    return Array.from(types).sort();
  }, [costs]);

  // Filter + search
  const filteredCosts = useMemo(() => {
    let result = [...costs];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.concept.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (costTypeFullLabels[c.costType] || c.costType).toLowerCase().includes(q)
      );
    }

    if (filterCategory) {
      result = result.filter((c) => c.category === filterCategory);
    }

    if (filterType) {
      result = result.filter((c) => c.costType === filterType);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        cmp = a.amount - b.amount;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [costs, search, filterCategory, filterType, sortField, sortDir]);

  // Totals for filtered results
  const totalFiltered = useMemo(() => filteredCosts.reduce((s, c) => s + c.amount, 0), [filteredCosts]);
  const totalMaterials = useMemo(() => filteredCosts.reduce((s, c) => s + (c.costType === "material" || c.costType === "repuesto" ? c.amount : 0), 0), [filteredCosts]);
  const totalLabor = useMemo(() => filteredCosts.reduce((s, c) => s + (c.costType === "mano_de_obra" ? c.amount : 0), 0), [filteredCosts]);

  const hasActiveFilters = search || filterCategory || filterType;

  const handleSort = (field: "date" | "amount") => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilterCategory("");
    setFilterType("");
  };

  const fmtArs = (cost: Cost) => {
    if (cost.currency === "ARS") {
      return `$${cost.amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
    }
    if (cost.exchangeRate) {
      return `$${(cost.amount * cost.exchangeRate).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
    }
    return "—";
  };

  const fmtTc = (cost: Cost) => {
    if (cost.exchangeRate) {
      return cost.exchangeRate.toLocaleString("es-AR", { maximumFractionDigits: 0 });
    }
    if (cost.currency === "ARS" && cost.amount > 0) {
      return "—";
    }
    return "—";
  };

  const fmtUsd = (cost: Cost) => {
    if (cost.currency === "USD") {
      return fmt(cost.amount);
    }
    if (cost.currency === "ARS" && cost.exchangeRate && cost.exchangeRate > 0) {
      return fmt(cost.amount / cost.exchangeRate);
    }
    return fmt(cost.amount);
  };

  return (
    <div>
      {/* Search + Filters row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a6b82" strokeWidth="2"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar concepto, categoría..."
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              background: "rgba(6, 11, 20, 0.6)",
              border: "1px solid rgba(56, 189, 248, 0.08)",
              borderRadius: 8,
              color: "#e8edf5",
              fontSize: 13,
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#38bdf8")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.08)")}
          />
        </div>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: "9px 28px 9px 12px",
            background: "rgba(6, 11, 20, 0.6)",
            border: "1px solid rgba(56, 189, 248, 0.08)",
            borderRadius: 8,
            color: filterCategory ? "#e8edf5" : "#5a6b82",
            fontSize: 13,
            outline: "none",
            cursor: "pointer",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a6b82' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
          }}
        >
          <option value="">Categoría</option>
          {uniqueCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: "9px 28px 9px 12px",
            background: "rgba(6, 11, 20, 0.6)",
            border: "1px solid rgba(56, 189, 248, 0.08)",
            borderRadius: 8,
            color: filterType ? "#e8edf5" : "#5a6b82",
            fontSize: 13,
            outline: "none",
            cursor: "pointer",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a6b82' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
          }}
        >
          <option value="">Tipo</option>
          {uniqueTypes.map((t) => (
            <option key={t} value={t}>{costTypeFullLabels[t] || t}</option>
          ))}
        </select>

        {/* Add button */}
        {canEdit && (
          <button
            onClick={onAddClick}
            style={{
              background: "linear-gradient(135deg, #38bdf8, #7dd3fc)",
              border: "none",
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 12,
              fontWeight: 600,
              color: "#060b14",
              cursor: "pointer",
              boxShadow: "0 2px 12px rgba(56, 189, 248, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(56, 189, 248, 0.35)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(56, 189, 248, 0.2)")}
          >
            + Nuevo costo
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
          {filterCategory && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: 6,
              fontSize: 11, color: "#7dd3fc",
            }}>
              {filterCategory}
              <button
                onClick={() => setFilterCategory("")}
                style={{ background: "none", border: "none", color: "#7dd3fc", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2 }}
              >
                ×
              </button>
            </span>
          )}
          {filterType && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: 6,
              fontSize: 11, color: "#7dd3fc",
            }}>
              {costTypeFullLabels[filterType] || filterType}
              <button
                onClick={() => setFilterType("")}
                style={{ background: "none", border: "none", color: "#7dd3fc", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2 }}
              >
                ×
              </button>
            </span>
          )}
          <button
            onClick={clearFilters}
            style={{ background: "none", border: "none", color: "#5a6b82", fontSize: 11, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Results info */}
      <div style={{ fontSize: 12, color: "#5a6b82", marginBottom: 10 }}>
        {hasActiveFilters
          ? `${filteredCosts.length} de ${costs.length} resultados`
          : `${costs.length} costos`}
      </div>

      {/* Table */}
      <div className="responsive-table" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(56, 189, 248, 0.06)" }}>
              <th
                onClick={() => handleSort("date")}
                style={{ textAlign: "left", padding: "10px 0", color: "#5a6b82", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, cursor: "pointer", userSelect: "none" }}
              >
                Fecha {sortField === "date" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "#5a6b82", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Concepto</th>
              <th style={{ textAlign: "center", padding: "10px 8px", color: "#5a6b82", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Categoría</th>
              <th style={{ textAlign: "center", padding: "10px 8px", color: "#5a6b82", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Tipo</th>
              <th
                onClick={() => handleSort("amount")}
                style={{ textAlign: "right", padding: "10px 8px", color: "#5a6b82", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, cursor: "pointer", userSelect: "none" }}
              >
                USD {sortField === "amount" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th style={{ textAlign: "right", padding: "10px 8px", color: "#5a6b82", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>ARS</th>
              <th style={{ textAlign: "right", padding: "10px 0", color: "#5a6b82", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>TC</th>
            </tr>
          </thead>
          <tbody>
            {filteredCosts.map((cost) => (
              <tr
                key={cost.id}
                style={{ borderBottom: "1px solid rgba(56, 189, 248, 0.04)", transition: "background-color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(56, 189, 248, 0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <td style={{ padding: "10px 0", color: "#8899b0", whiteSpace: "nowrap", fontSize: 12 }}>
                  {new Date(cost.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </td>
                <td style={{ padding: "10px 8px", color: "#e8edf5", fontWeight: 500 }}>
                  {cost.concept}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#8899b0" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: catColors[cost.category] || "#8899b0", flexShrink: 0 }} />
                    {cost.category}
                  </span>
                </td>
                <td style={{ padding: "10px 8px", textAlign: "center" }}>
                  <span
                    style={{
                      padding: "2px 7px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      background: cost.costType === "material" || cost.costType === "repuesto"
                        ? "rgba(56, 189, 248, 0.08)" : "rgba(52, 211, 153, 0.08)",
                      color: cost.costType === "material" || cost.costType === "repuesto"
                        ? "#7dd3fc" : "#6ee7b7",
                    }}
                  >
                    {costTypeLabels[cost.costType] || cost.costType}
                  </span>
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "#e8edf5", fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {fmtUsd(cost)}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "#5a6b82", fontSize: 12, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {fmtArs(cost)}
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", color: "#3d4f63", fontSize: 12, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {fmtTc(cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals footer */}
      {filteredCosts.length > 0 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 0",
          marginTop: 8,
          borderTop: "2px solid rgba(56, 189, 248, 0.12)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#8899b0" }}>
              TOTAL{hasActiveFilters ? ` (${filteredCosts.length})` : ""}
            </span>
            <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#5a6b82" }}>
              {totalMaterials > 0 && (
                <span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", display: "inline-block", marginRight: 4, verticalAlign: "middle" }} />
                  Mat {fmt(totalMaterials)}
                </span>
              )}
              {totalLabor > 0 && (
                <span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block", marginRight: 4, verticalAlign: "middle" }} />
                  MO {fmt(totalLabor)}
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e8edf5" }}>{fmt(totalFiltered)}</div>
          </div>
        </div>
      )}

      {costs.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "#5a6b82" }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>Sin costos registrados</div>
          {canEdit && (
            <button
              onClick={onAddClick}
              style={{
                background: "transparent",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: "#7dd3fc",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(56, 189, 248, 0.08)";
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.2)";
              }}
            >
              + Agregar primer costo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
