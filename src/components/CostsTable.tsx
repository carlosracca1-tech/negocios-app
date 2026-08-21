"use client";

import { Cost, Partida } from "@/types";
import { useState, useMemo } from "react";
import { fmt } from "@/lib/format";
import { catColors } from "@/lib/constants";
import { costArs } from "@/lib/financial";

/** "$1.234.567" — pesos nominales, formato es-AR */
const fmtArsNum = (n: number) =>
  "$" + Math.round(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });

const costTypeLabels: Record<string, string> = {
  material: "Mat",
  mano_de_obra: "MO",
  servicio: "Serv",
  tramite: "Trám",
  repuesto: "Rep",
};

/**
 * Tipos de costo que NO necesitan estar imputados a un presupuesto.
 * Un material es una compra suelta: solo se imputa si el usuario lo aclara,
 * asi que no cuenta como "pendiente" ni ensucia la tabla con avisos.
 */
const TIPOS_SIN_PRESUPUESTO = new Set<string>(["material"]);
const requierePresupuesto = (costType: string) => !TIPOS_SIN_PRESUPUESTO.has(costType);

const costTypeFullLabels: Record<string, string> = {
  material: "Material",
  mano_de_obra: "Mano de obra",
  servicio: "Servicio",
  tramite: "Trámite",
  repuesto: "Repuesto",
};

interface CostsTableProps {
  costs: Cost[];
  /** Presupuestos del proyecto, para mostrar y filtrar la imputación de cada costo. */
  partidas?: Partida[];
  onAddClick: () => void;
  /** Abre la vista previa de imputacion automatica. */
  onAutoImputar?: () => void;
  onEditClick?: (cost: Cost) => void;
  onDelete?: (cost: Cost) => void;
  canEdit?: boolean;
}

export default function CostsTable({ costs, partidas = [], onAddClick, onAutoImputar, onEditClick, onDelete, canEdit = true }: CostsTableProps) {
  const showActions = canEdit && Boolean(onEditClick || onDelete);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  // "" = todos | "__none__" = sin imputar | <partidaId>
  const [filterPartida, setFilterPartida] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");

  const partidaNombre = useMemo(() => {
    const m = new Map<string, string>();
    partidas.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [partidas]);

  // Solo cuentan los tipos que si necesitan presupuesto (materiales quedan afuera).
  const sinImputar = useMemo(
    () =>
      costs.filter(
        (c) => requierePresupuesto(c.costType) && (!c.partidaId || !partidaNombre.has(c.partidaId))
      ).length,
    [costs, partidaNombre]
  );
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

  // USD-normalized value of a cost (matches the USD column logic)
  const usdValue = (cost: Cost) => {
    if (cost.amountUsd != null) return cost.amountUsd;
    if (cost.currency === "ARS" && cost.exchangeRate && cost.exchangeRate > 0) {
      return cost.amount / cost.exchangeRate;
    }
    return cost.amount;
  };

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

    if (filterPartida === "__none__") {
      result = result.filter((c) => requierePresupuesto(c.costType) && !c.partidaId);
    } else if (filterPartida) {
      result = result.filter((c) => c.partidaId === filterPartida);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        cmp = usdValue(a) - usdValue(b);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [costs, search, filterCategory, filterType, filterPartida, sortField, sortDir]);

  // Totals for filtered results — USD (normalizado) y ARS (histórico, cada gasto a su TC)
  const totalFiltered = useMemo(() => filteredCosts.reduce((s, c) => s + usdValue(c), 0), [filteredCosts]);
  const totalMaterials = useMemo(() => filteredCosts.reduce((s, c) => s + (c.costType === "material" || c.costType === "repuesto" ? usdValue(c) : 0), 0), [filteredCosts]);
  const totalLabor = useMemo(() => filteredCosts.reduce((s, c) => s + (c.costType === "mano_de_obra" ? usdValue(c) : 0), 0), [filteredCosts]);

  const totalFilteredArs = useMemo(() => filteredCosts.reduce((s, c) => s + costArs(c), 0), [filteredCosts]);
  const totalMaterialsArs = useMemo(() => filteredCosts.reduce((s, c) => s + (c.costType === "material" || c.costType === "repuesto" ? costArs(c) : 0), 0), [filteredCosts]);
  const totalLaborArs = useMemo(() => filteredCosts.reduce((s, c) => s + (c.costType === "mano_de_obra" ? costArs(c) : 0), 0), [filteredCosts]);
  // Gastos sin TC cargado: no se pueden expresar en pesos, se avisa para no mentir el total.
  const sinTc = useMemo(() => filteredCosts.filter((c) => costArs(c) === 0).length, [filteredCosts]);

  const hasActiveFilters = Boolean(search || filterCategory || filterType || filterPartida);

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
    setFilterPartida("");
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

  const fmtUsd = (cost: Cost) => fmt(usdValue(cost));

  return (
    <div>
      {/* Search + Filters row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"
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
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--text-primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--surface-2)")}
          />
        </div>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: "9px 28px 9px 12px",
            background: "var(--surface-2)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            color: filterCategory ? "var(--text-primary)" : "var(--text-tertiary)",
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
            background: "var(--surface-2)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            color: filterType ? "var(--text-primary)" : "var(--text-tertiary)",
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

        {/* Filtro por presupuesto */}
        {partidas.length > 0 && (
          <select
            value={filterPartida}
            onChange={(e) => setFilterPartida(e.target.value)}
            style={{
              padding: "9px 28px 9px 12px",
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              color: filterPartida ? "var(--text-primary)" : "var(--text-tertiary)",
              fontSize: 13,
              outline: "none",
              cursor: "pointer",
              appearance: "none",
              maxWidth: 200,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a6b82' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
            }}
          >
            <option value="">Presupuesto</option>
            <option value="__none__">Sin imputar ({sinImputar})</option>
            {partidas.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {/* Add button */}
        {canEdit && (
          <button
            onClick={onAddClick}
            style={{
              background: "var(--accent)",
              border: "none",
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--accent-on)",
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
              padding: "3px 10px", background: "var(--surface-2)",
              border: "1px solid var(--border-strong)", borderRadius: 6,
              fontSize: 11, color: "var(--text-primary)",
            }}>
              {filterCategory}
              <button
                onClick={() => setFilterCategory("")}
                style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2 }}
              >
                ×
              </button>
            </span>
          )}
          {filterType && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", background: "var(--surface-2)",
              border: "1px solid var(--border-strong)", borderRadius: 6,
              fontSize: 11, color: "var(--text-primary)",
            }}>
              {costTypeFullLabels[filterType] || filterType}
              <button
                onClick={() => setFilterType("")}
                style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2 }}
              >
                ×
              </button>
            </span>
          )}
          {filterPartida && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", background: "var(--surface-2)",
              border: "1px solid var(--border-strong)", borderRadius: 6,
              fontSize: 11, color: "var(--text-primary)",
            }}>
              {filterPartida === "__none__" ? "Sin imputar" : partidaNombre.get(filterPartida) || "Presupuesto"}
              <button
                onClick={() => setFilterPartida("")}
                style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2 }}
              >
                ×
              </button>
            </span>
          )}
          <button
            onClick={clearFilters}
            style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 11, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Results info */}
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>
        {hasActiveFilters
          ? `${filteredCosts.length} de ${costs.length} resultados`
          : `${costs.length} costos`}
      </div>

      {/* Table */}
      <div className="responsive-table" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-faint)" }}>
              <th
                onClick={() => handleSort("date")}
                style={{ textAlign: "left", padding: "10px 0", color: "var(--text-tertiary)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, cursor: "pointer", userSelect: "none" }}
              >
                Fecha {sortField === "date" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-tertiary)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Concepto</th>
              <th style={{ textAlign: "center", padding: "10px 8px", color: "var(--text-tertiary)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Categoría</th>
              <th style={{ textAlign: "center", padding: "10px 8px", color: "var(--text-tertiary)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Tipo</th>
              <th
                onClick={() => handleSort("amount")}
                style={{ textAlign: "right", padding: "10px 8px", color: "var(--text-tertiary)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, cursor: "pointer", userSelect: "none" }}
              >
                USD {sortField === "amount" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th style={{ textAlign: "right", padding: "10px 8px", color: "var(--text-tertiary)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>ARS</th>
              <th style={{ textAlign: "right", padding: "10px 0", color: "var(--text-tertiary)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>TC</th>
              {showActions && (
                <th style={{ textAlign: "center", padding: "10px 0 10px 8px", color: "var(--text-tertiary)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, width: 80 }}></th>
              )}
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
                <td style={{ padding: "10px 0", color: "var(--text-secondary)", whiteSpace: "nowrap", fontSize: 12 }}>
                  {new Date(cost.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </td>
                <td style={{ padding: "10px 8px", color: "var(--text-primary)", fontWeight: 500 }}>
                  {cost.concept}
                  {partidas.length > 0 &&
                    (cost.partidaId && partidaNombre.has(cost.partidaId) ? (
                      <div style={{ fontSize: 10.5, marginTop: 2, color: "var(--text-quaternary)" }}>
                        {`↳ ${partidaNombre.get(cost.partidaId)}`}
                      </div>
                    ) : requierePresupuesto(cost.costType) ? (
                      <div style={{ fontSize: 10.5, marginTop: 2, color: "var(--text-quaternary)" }}>
                        ↳ sin presupuesto
                      </div>
                    ) : null)}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-secondary)" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: catColors[cost.category] || "var(--text-secondary)", flexShrink: 0 }} />
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
                        ? "var(--surface-2)" : "var(--success-soft)",
                      color: cost.costType === "material" || cost.costType === "repuesto"
                        ? "var(--text-primary)" : "var(--success)",
                    }}
                  >
                    {costTypeLabels[cost.costType] || cost.costType}
                  </span>
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "var(--text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {fmtUsd(cost)}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "var(--text-tertiary)", fontSize: 12, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {fmtArs(cost)}
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", color: "var(--text-quaternary)", fontSize: 12, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {fmtTc(cost)}
                </td>
                {showActions && (
                  <td style={{ padding: "10px 0 10px 8px", textAlign: "center", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", gap: 4 }}>
                      {onEditClick && (
                        <button
                          onClick={() => onEditClick(cost)}
                          title="Editar" aria-label="Editar costo"
                          style={{ background: "transparent", border: "1px solid var(--border-faint)", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1 }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        >
                          ✎
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(cost)}
                          title="Eliminar" aria-label="Eliminar costo"
                          style={{ background: "transparent", border: "1px solid var(--border-faint)", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1 }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--danger-soft)"; e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "var(--danger-border)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border-faint)"; }}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                )}
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
          borderTop: "2px solid var(--border-default)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
              TOTAL{hasActiveFilters ? ` (${filteredCosts.length})` : ""}
            </span>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-tertiary)", flexWrap: "wrap" }}>
              {totalMaterials > 0 && (
                <span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-primary)", display: "inline-block", marginRight: 4, verticalAlign: "middle" }} />
                  Mat {fmt(totalMaterials)}
                  <span style={{ color: "var(--text-quaternary)", marginLeft: 5 }}>· {fmtArsNum(totalMaterialsArs)}</span>
                </span>
              )}
              {totalLabor > 0 && (
                <span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block", marginRight: 4, verticalAlign: "middle" }} />
                  MO {fmt(totalLabor)}
                  <span style={{ color: "var(--text-quaternary)", marginLeft: 5 }}>· {fmtArsNum(totalLaborArs)}</span>
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {fmt(totalFiltered)}
            </div>
            <div
              title="Suma de lo que realmente pagaste en pesos, cada gasto al tipo de cambio del día en que se cargó."
              style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}
            >
              {fmtArsNum(totalFilteredArs)}
              <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-quaternary)", marginLeft: 5 }}>ARS</span>
            </div>
            {sinTc > 0 && (
              <div style={{ fontSize: 10.5, color: "var(--warning)", marginTop: 3 }}>
                {sinTc} {sinTc === 1 ? "gasto sin" : "gastos sin"} tipo de cambio — no suman en ARS
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nota al pie: solo para los tipos que si deberian estar imputados */}
      {partidas.length > 0 && sinImputar > 0 && !filterPartida && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            marginTop: 12, fontSize: 11, color: "var(--text-quaternary)",
          }}
        >
          <span>
            {sinImputar} {sinImputar === 1 ? "costo sin imputar" : "costos sin imputar"} a un presupuesto — no suma en Presupuestado vs Real.
          </span>
          <button
            onClick={() => setFilterPartida("__none__")}
            style={{
              background: "none", border: "none", color: "var(--text-tertiary)",
              fontSize: 11, cursor: "pointer", textDecoration: "underline",
              textUnderlineOffset: 2, padding: 0, whiteSpace: "nowrap",
            }}
          >
            Ver cuáles
          </button>
          {canEdit && onAutoImputar && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <button
                onClick={onAutoImputar}
                style={{
                  background: "none", border: "none", color: "var(--text-tertiary)",
                  fontSize: 11, cursor: "pointer", textDecoration: "underline",
                  textUnderlineOffset: 2, padding: 0, whiteSpace: "nowrap",
                }}
              >
                Imputar automáticamente
              </button>
            </>
          )}
        </div>
      )}

      {costs.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-tertiary)" }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>Sin costos registrados</div>
          {canEdit && (
            <button
              onClick={onAddClick}
              style={{
                background: "transparent",
                border: "1px solid var(--border-strong)",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--surface-2)";
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "var(--border-strong)";
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
