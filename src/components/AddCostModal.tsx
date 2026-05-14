"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useCreateCost } from "@/hooks/useProjects";
import {
  modalInputStyle as inputStyle,
  focusInput,
  blurInput,
  categoriesByProjectType,
  costTypesByProjectType,
  allowedCostTypesByCategory,
} from "@/lib/constants";

interface AddCostModalProps {
  projectId: string;
  projectType?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddCostModal({
  projectId,
  projectType = "Casa",
  isOpen,
  onClose,
  onSuccess,
}: AddCostModalProps) {
  const categories = useMemo(
    () => categoriesByProjectType[projectType] || categoriesByProjectType.Casa,
    [projectType]
  );
  const allCostTypes = useMemo(
    () => costTypesByProjectType[projectType] || costTypesByProjectType.Casa,
    [projectType]
  );

  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("USD");
  const [category, setCategory] = useState(categories[0]?.value || "Obra");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const { mutate, loading, error } = useCreateCost();

  // === Cotización del dólar blue (BNA / dolarapi) — bloqueada ===
  const [blueRate, setBlueRate] = useState<{ compra: number; venta: number; promedio: number; source?: string } | null>(null);
  const [blueLoading, setBlueLoading] = useState(false);
  const [blueError, setBlueError] = useState("");

  // === Tipo de costo filtrado según categoría ===
  const filteredCostTypes = useMemo(() => {
    const allowed = allowedCostTypesByCategory[category];
    if (!allowed) return allCostTypes;
    return allCostTypes.filter((ct) => allowed.includes(ct.value));
  }, [category, allCostTypes]);

  const [costType, setCostType] = useState(filteredCostTypes[0]?.value || "material");

  // Cuando cambia la categoría, ajustar costType al primer tipo permitido
  useEffect(() => {
    if (!filteredCostTypes.some((ct) => ct.value === costType)) {
      setCostType(filteredCostTypes[0]?.value || "material");
    }
  }, [filteredCostTypes, costType]);

  const fetchBlueRate = useCallback(async () => {
    setBlueLoading(true);
    setBlueError("");
    try {
      const res = await fetch("/api/dolar-blue");
      if (!res.ok) throw new Error("No se pudo obtener cotización");
      const data = await res.json();
      setBlueRate(data);
    } catch {
      setBlueError("No se pudo obtener el dólar blue. Reintentá en unos segundos.");
    } finally {
      setBlueLoading(false);
    }
  }, []);

  // Fetch dólar blue al abrir el modal (lo necesitamos siempre, por si el usuario cambia a ARS)
  useEffect(() => {
    if (isOpen && !blueRate && !blueLoading) {
      fetchBlueRate();
    }
  }, [isOpen, blueRate, blueLoading, fetchBlueRate]);

  const resetForm = () => {
    setConcept("");
    setAmount("");
    setCurrency("USD");
    setCategory(categories[0]?.value || "Obra");
    setCostType(filteredCostTypes[0]?.value || "material");
    setDate(new Date().toISOString().split("T")[0]);
  };

  // Conversión a USD para guardar
  const amountNum = parseFloat(amount) || 0;
  const usdAmount =
    currency === "USD"
      ? amountNum
      : blueRate && blueRate.promedio > 0
        ? amountNum / blueRate.promedio
        : 0;

  const canSubmit =
    concept.trim().length > 0 &&
    amountNum > 0 &&
    (currency === "USD" || (blueRate && blueRate.promedio > 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await mutate(projectId, {
        concept,
        amount: amountNum,
        category,
        costType,
        date: new Date(date).toISOString(),
        currency,
        exchangeRate: currency === "ARS" && blueRate ? blueRate.promedio : null,
      });
      resetForm();
      onSuccess?.();
      onClose();
    } catch {
      // Error handled in hook
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface-glass)", backdropFilter: "blur(20px)",
          borderRadius: 16, padding: 24, width: 480, maxWidth: "92%",
          maxHeight: "92vh", overflowY: "auto",
          boxShadow: "var(--shadow-elevated), 0 0 0 1px var(--border-default)",
          border: "1px solid var(--border-default)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Agregar costo</h2>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
              Proyecto tipo <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{projectType}</span>
            </p>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "var(--text-primary)",
            background: "var(--surface-2)", padding: "4px 10px", borderRadius: 6,
          }}>
            {projectType === "Auto" ? "🚗" : "🏠"} {projectType}
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* === SELECTOR DE MONEDA — destacado arriba === */}
          <div>
            <label style={labelStyle}>Moneda del gasto</label>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 8, padding: 4,
              background: "var(--surface-2)",
              borderRadius: 12,
              border: "1px solid var(--border-default)",
            }}>
              {([
                { value: "USD", label: "U$D Dólar", sub: "Se guarda tal cual" },
                { value: "ARS", label: "AR$ Pesos", sub: "Se dolariza al blue" },
              ] as const).map((c) => {
                const active = currency === c.value;
                return (
                  <button
                    key={c.value} type="button"
                    onClick={() => setCurrency(c.value)}
                    style={{
                      padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                      border: "none", textAlign: "left",
                      background: active ? "var(--surface-3)" : "transparent",
                      boxShadow: active ? "0 0 0 1px var(--border-strong)" : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {c.label}
                    </div>
                    <div style={{ fontSize: 10, color: active ? "var(--text-secondary)" : "var(--text-tertiary)", marginTop: 2 }}>
                      {c.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label style={labelStyle}>Concepto</label>
            <input
              type="text" value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder={projectType === "Auto" ? "Ej: Cambio de correa" : "Ej: Pintura interior"}
              required style={inputStyle} onFocus={focusInput} onBlur={blurInput}
            />
          </div>

          {/* Monto */}
          <div>
            <label style={labelStyle}>
              Monto en {currency === "USD" ? "dólares (U$D)" : "pesos (AR$)"}
            </label>
            <input
              type="number" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={currency === "USD" ? "0.00" : "0"}
              step={currency === "USD" ? "0.01" : "1"}
              min="0"
              required style={inputStyle} onFocus={focusInput} onBlur={blurInput}
            />
          </div>

          {/* === Bloque conversión ARS → USD === */}
          {currency === "ARS" && (
            <div style={{
              padding: "12px 14px",
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              borderRadius: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Dólar blue — promedio compra/venta
                </div>
                <button
                  type="button"
                  onClick={fetchBlueRate}
                  disabled={blueLoading}
                  title="Refrescar cotización"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: 6,
                    width: 24, height: 24,
                    cursor: blueLoading ? "wait" : "pointer",
                    color: "var(--text-primary)",
                    fontSize: 12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {blueLoading ? "…" : "↻"}
                </button>
              </div>

              {blueLoading && !blueRate && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Obteniendo cotización…</div>
              )}

              {blueRate && (
                <>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, marginBottom: 10 }}>
                    <span style={{ color: "var(--text-tertiary)" }}>
                      Compra: <span style={{ color: "var(--success)", fontWeight: 600 }}>${blueRate.compra}</span>
                    </span>
                    <span style={{ color: "var(--text-tertiary)" }}>
                      Venta: <span style={{ color: "var(--danger)", fontWeight: 600 }}>${blueRate.venta}</span>
                    </span>
                    <span style={{ color: "var(--text-tertiary)", marginLeft: "auto" }}>
                      Promedio: <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 12 }}>${blueRate.promedio}</span>
                    </span>
                  </div>

                  {amountNum > 0 && (
                    <div style={{
                      paddingTop: 10,
                      borderTop: "1px dashed var(--border-default)",
                      display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    }}>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        AR$ {amountNum.toLocaleString("es-AR")} ÷ {blueRate.promedio}
                      </span>
                      <span className="tabular" style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                        ≈ U$D {usdAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </>
              )}

              {blueError && (
                <div style={{ fontSize: 11, color: "var(--warning)", marginTop: 4 }}>
                  ⚠ {blueError}
                </div>
              )}

              <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 8, lineHeight: 1.4 }}>
                La cotización es del dólar blue al momento de cargar el gasto (fuente: dolarapi.com / bluelytics).
                No se puede modificar manualmente para mantener consistencia.
              </div>
            </div>
          )}

          {/* Categoría — cards seleccionables */}
          <div>
            <label style={labelStyle}>Categoría</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {categories.map((cat) => (
                <button
                  key={cat.value} type="button"
                  onClick={() => setCategory(cat.value)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    fontSize: 12, fontWeight: 500, textAlign: "left",
                    border: category === cat.value
                      ? "1px solid var(--border-strong)"
                      : "1px solid var(--border-faint)",
                    background: category === cat.value
                      ? "var(--surface-2)"
                      : "var(--surface-1)",
                    color: category === cat.value ? "var(--text-primary)" : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{cat.icon}</span>
                  <span style={{ lineHeight: 1.2 }}>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de costo — solo si hay más de una opción permitida */}
          {filteredCostTypes.length > 1 ? (
            <div>
              <label style={labelStyle}>Tipo</label>
              <div style={{ display: "flex", gap: 6 }}>
                {filteredCostTypes.map((ct) => (
                  <button
                    key={ct.value} type="button"
                    onClick={() => setCostType(ct.value)}
                    style={{
                      flex: 1, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                      fontSize: 12, fontWeight: 500, border: costType === ct.value
                        ? "1px solid var(--border-strong)"
                        : "1px solid var(--border-faint)",
                      background: costType === ct.value
                        ? "var(--surface-2)"
                        : "var(--surface-1)",
                      color: costType === ct.value ? "var(--text-primary)" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Una sola opción: la mostramos como pill informativa, no como selector
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 10,
              background: "var(--surface-1)",
              border: "1px dashed var(--border-default)",
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6 }}>
                Tipo
              </span>
              <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>
                {filteredCostTypes[0]?.label}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginLeft: "auto" }}>
                auto-asignado
              </span>
            </div>
          )}

          {/* Fecha */}
          <div>
            <label style={labelStyle}>Fecha</label>
            <input
              type="date" value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle} onFocus={focusInput} onBlur={blurInput}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12, color: "var(--danger)",
              background: "var(--danger-soft)",
              padding: "10px 12px", borderRadius: 8,
              border: "1px solid var(--danger-border)",
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: 10,
                border: "1px solid var(--border-default)",
                background: "transparent", fontSize: 13, fontWeight: 600,
                color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--surface-1)";
                e.currentTarget.style.borderColor = "var(--border-strong)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "var(--border-default)";
              }}
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={loading || !canSubmit}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: 10, border: "none",
                background: "var(--accent)",
                fontSize: 13, fontWeight: 600, color: "var(--accent-on)",
                cursor: (loading || !canSubmit) ? "not-allowed" : "pointer",
                opacity: (loading || !canSubmit) ? 0.5 : 1,
                boxShadow: "var(--shadow-button)",
              }}
              onMouseEnter={(e) => !loading && canSubmit && (e.currentTarget.style.filter = "brightness(0.92)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              {loading ? "Agregando…" : currency === "ARS" && usdAmount > 0 ? `Agregar (U$D ${usdAmount.toFixed(2)})` : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: 0.8,
};
