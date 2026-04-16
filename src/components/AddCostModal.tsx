"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useCreateCost } from "@/hooks/useProjects";
import {
  modalInputStyle as inputStyle,
  focusInput,
  blurInput,
  categoriesByProjectType,
  costTypesByProjectType,
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
  const costTypes = useMemo(
    () => costTypesByProjectType[projectType] || costTypesByProjectType.Casa,
    [projectType]
  );

  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("USD");
  const [exchangeRate, setExchangeRate] = useState("");
  const [category, setCategory] = useState(categories[0]?.value || "Obra");
  const [costType, setCostType] = useState(costTypes[0]?.value || "material");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const { mutate, loading, error } = useCreateCost();

  // Dólar blue auto-fetch
  const [blueRate, setBlueRate] = useState<{ compra: number; venta: number; promedio: number } | null>(null);
  const [blueLoading, setBlueLoading] = useState(false);
  const [blueError, setBlueError] = useState("");

  const fetchBlueRate = useCallback(async () => {
    setBlueLoading(true);
    setBlueError("");
    try {
      const res = await fetch("/api/dolar-blue");
      if (!res.ok) throw new Error("No se pudo obtener cotización");
      const data = await res.json();
      setBlueRate(data);
      // Auto-completar el tipo de cambio con el promedio
      setExchangeRate(String(data.promedio));
    } catch {
      setBlueError("No se pudo obtener el dólar blue. Ingresá el tipo de cambio manualmente.");
    } finally {
      setBlueLoading(false);
    }
  }, []);

  // Fetch dólar blue cuando se selecciona ARS
  useEffect(() => {
    if (currency === "ARS" && !blueRate && isOpen) {
      fetchBlueRate();
    }
  }, [currency, blueRate, isOpen, fetchBlueRate]);

  const resetForm = () => {
    setConcept("");
    setAmount("");
    setCurrency("USD");
    setExchangeRate("");
    setBlueRate(null);
    setBlueError("");
    setCategory(categories[0]?.value || "Obra");
    setCostType(costTypes[0]?.value || "material");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutate(projectId, {
        concept,
        amount: parseFloat(amount),
        category,
        costType,
        date: new Date(date).toISOString(),
        currency,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
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
        background: "rgba(6, 11, 20, 0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "rgba(12, 21, 36, 0.95)", backdropFilter: "blur(20px)",
          borderRadius: 16, padding: 24, width: 460, maxWidth: "90%",
          maxHeight: "90vh", overflowY: "auto",
          boxShadow:
            "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 189, 248, 0.1), 0 0 40px rgba(56, 189, 248, 0.05)",
          border: "1px solid rgba(56, 189, 248, 0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8edf5", margin: 0 }}>Agregar costo</h2>
            <p style={{ fontSize: 12, color: "#5a6b82", margin: "4px 0 0" }}>
              Proyecto tipo <span style={{ color: "#7dd3fc", fontWeight: 600 }}>{projectType}</span>
            </p>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#38bdf8",
            background: "rgba(56, 189, 248, 0.08)", padding: "4px 10px", borderRadius: 6,
          }}>
            {projectType === "Auto" ? "🚗" : "🏠"} {projectType}
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

          {/* Monto + Moneda */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
            <div>
              <label style={labelStyle}>Monto</label>
              <input
                type="number" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" step="0.01" min="0"
                required style={inputStyle} onFocus={focusInput} onBlur={blurInput}
              />
            </div>
            <div style={{ width: 120 }}>
              <label style={labelStyle}>Moneda</label>
              <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(56, 189, 248, 0.1)", height: 44 }}>
                {(["USD", "ARS"] as const).map((c) => (
                  <button
                    key={c} type="button"
                    onClick={() => setCurrency(c)}
                    style={{
                      flex: 1, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: currency === c ? "rgba(56, 189, 248, 0.15)" : "rgba(6, 11, 20, 0.6)",
                      color: currency === c ? "#7dd3fc" : "#5a6b82",
                      transition: "all 0.2s",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tipo de cambio (solo ARS) */}
          {currency === "ARS" && (
            <div>
              <label style={labelStyle}>
                Tipo de cambio (Blue)
                {blueLoading && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#7dd3fc", marginLeft: 6 }}>Obteniendo cotización...</span>}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number" value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="Ej: 1200" step="0.01" min="0"
                  style={inputStyle} onFocus={focusInput} onBlur={blurInput}
                />
                {blueRate && (
                  <button
                    type="button"
                    onClick={fetchBlueRate}
                    title="Actualizar cotización"
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", fontSize: 14,
                      color: "#5a6b82", padding: 4,
                    }}
                  >
                    ↻
                  </button>
                )}
              </div>
              {blueRate && (
                <div style={{ fontSize: 11, color: "#5a6b82", marginTop: 4, display: "flex", gap: 12 }}>
                  <span>Compra: <span style={{ color: "#4ade80" }}>${blueRate.compra}</span></span>
                  <span>Venta: <span style={{ color: "#f87171" }}>${blueRate.venta}</span></span>
                  <span>Promedio: <span style={{ color: "#7dd3fc", fontWeight: 600 }}>${blueRate.promedio}</span></span>
                </div>
              )}
              {blueError && (
                <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 4 }}>
                  ⚠ {blueError}
                </div>
              )}
              {exchangeRate && amount && (
                <div style={{ fontSize: 12, color: "#7dd3fc", marginTop: 6, fontWeight: 600 }}>
                  ≈ U$D {(parseFloat(amount) / parseFloat(exchangeRate)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
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
                      ? "1px solid rgba(56, 189, 248, 0.35)"
                      : "1px solid rgba(56, 189, 248, 0.06)",
                    background: category === cat.value
                      ? "rgba(56, 189, 248, 0.08)"
                      : "rgba(6, 11, 20, 0.4)",
                    color: category === cat.value ? "#e8edf5" : "#8899b0",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{cat.icon}</span>
                  <span style={{ lineHeight: 1.2 }}>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de costo */}
          <div>
            <label style={labelStyle}>Tipo</label>
            <div style={{ display: "flex", gap: 6 }}>
              {costTypes.map((ct) => (
                <button
                  key={ct.value} type="button"
                  onClick={() => setCostType(ct.value)}
                  style={{
                    flex: 1, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    fontSize: 12, fontWeight: 500, border: costType === ct.value
                      ? "1px solid rgba(56, 189, 248, 0.35)"
                      : "1px solid rgba(56, 189, 248, 0.06)",
                    background: costType === ct.value
                      ? "rgba(56, 189, 248, 0.08)"
                      : "rgba(6, 11, 20, 0.4)",
                    color: costType === ct.value ? "#e8edf5" : "#8899b0",
                    transition: "all 0.15s",
                  }}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

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
              fontSize: 12, color: "#f87171",
              background: "rgba(248, 113, 113, 0.08)",
              padding: "10px 12px", borderRadius: 8,
              border: "1px solid rgba(248, 113, 113, 0.15)",
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
                border: "1px solid rgba(56, 189, 248, 0.12)",
                background: "transparent", fontSize: 13, fontWeight: 600,
                color: "#8899b0", cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(56, 189, 248, 0.06)";
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.12)";
              }}
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={loading}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #38bdf8, #7dd3fc)",
                fontSize: 13, fontWeight: 600, color: "#060b14",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                boxShadow: "0 2px 12px rgba(56, 189, 248, 0.2)",
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = "0 4px 20px rgba(56, 189, 248, 0.35)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(56, 189, 248, 0.2)")}
            >
              {loading ? "Agregando..." : "Agregar"}
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
  color: "#5a6b82",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: 0.8,
};
