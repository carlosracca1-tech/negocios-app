"use client";

import { useState, useMemo, useEffect } from "react";
import { useUpdateProject } from "@/hooks/useProjects";
import { Investor } from "@/types";

interface RegisterSaleModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  investors?: Investor[];
  totalInvestment?: number;
  initialSalePrice?: number | null;
  initialSaleDate?: Date | string | null;
  initialBuyerName?: string | null;
  isEditing?: boolean;
}

export default function RegisterSaleModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
  investors = [],
  totalInvestment = 0,
  initialSalePrice = null,
  initialSaleDate = null,
  initialBuyerName = null,
  isEditing = false,
}: RegisterSaleModalProps) {
  const [salePrice, setSalePrice] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const { mutate, loading, error } = useUpdateProject();

  // Prefill with current sale data when editing an already sold project
  useEffect(() => {
    if (!isOpen) return;
    setSalePrice(initialSalePrice != null ? String(initialSalePrice) : "");
    setSaleDate(
      initialSaleDate ? new Date(initialSaleDate).toISOString().slice(0, 10) : ""
    );
    setBuyerName(initialBuyerName ?? "");
  }, [isOpen, initialSalePrice, initialSaleDate, initialBuyerName]);

  // Calculate dividend distribution
  const dividendPreview = useMemo(() => {
    const price = parseFloat(salePrice) || 0;
    if (price === 0) return null;

    const result = price - totalInvestment;

    if (result <= 0) {
      return {
        profit: false,
        result,
        distributions: [],
      };
    }

    const distributions = investors.map((investor) => ({
      name: investor.name,
      percentage: investor.profitPercentage,
      amount: (investor.profitPercentage / 100) * result,
    }));

    return {
      profit: true,
      result,
      distributions,
    };
  }, [salePrice, totalInvestment, investors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updateData: Record<string, unknown> = {
        salePrice: parseFloat(salePrice),
        status: "vendido",
      };

      updateData.saleDate = saleDate ? new Date(saleDate).toISOString() : null;
      updateData.buyerName = buyerName.trim() || null;

      await mutate(projectId, updateData);
      onSuccess?.();
      onClose();
    } catch {
      // Error is handled in the hook
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface-glass)",
          backdropFilter: "blur(20px)",
          borderRadius: 16,
          padding: 24,
          width: 500,
          maxWidth: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(52, 211, 153, 0.1), 0 0 40px rgba(52, 211, 153, 0.05)",
          border: "1px solid var(--success-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
          {isEditing ? "Editar venta" : "Registrar venta"}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Sale Price */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Precio de venta
            </label>
            <input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0"
              step="0.01"
              min="0"
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--success-border)",
                backgroundColor: "var(--surface-2)",
                fontSize: 13,
                outline: "none",
                color: "var(--text-primary)",
                transition: "all 0.25s",
                backdropFilter: "blur(8px)",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--success)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(52, 211, 153, 0.1), 0 0 15px rgba(52, 211, 153, 0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--success-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Sale Date */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Fecha de venta (opcional)
            </label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--success-border)",
                backgroundColor: "var(--surface-2)",
                fontSize: 13,
                outline: "none",
                color: "var(--text-primary)",
                transition: "all 0.25s",
                backdropFilter: "blur(8px)",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--success)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(52, 211, 153, 0.1), 0 0 15px rgba(52, 211, 153, 0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--success-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Buyer Name */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Comprador (opcional)
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Nombre del comprador"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--success-border)",
                backgroundColor: "var(--surface-2)",
                fontSize: 13,
                outline: "none",
                color: "var(--text-primary)",
                transition: "all 0.25s",
                backdropFilter: "blur(8px)",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--success)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(52, 211, 153, 0.1), 0 0 15px rgba(52, 211, 153, 0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--success-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Dividend Distribution Preview */}
          {salePrice && dividendPreview && (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: "rgba(52, 211, 153, 0.05)",
                border: "1px solid rgba(52, 211, 153, 0.2)",
              }}
            >
              <h3
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--success)",
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Distribución de dividendos
              </h3>

              {dividendPreview.profit ? (
                <>
                  <div
                    style={{
                      marginBottom: 12,
                      paddingBottom: 12,
                      borderBottom: "1px solid var(--success-border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Precio de venta:</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                        ${parseFloat(salePrice).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Inversión total:</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                        ${totalInvestment.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--success)" }}>Resultado:</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>
                        ${dividendPreview.result.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {dividendPreview.distributions.length > 0 ? (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--text-tertiary)",
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Distribución por inversor
                      </div>
                      {dividendPreview.distributions.map((dist, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 0",
                            borderBottom: idx < dividendPreview.distributions.length - 1 ? "1px solid rgba(52, 211, 153, 0.1)" : "none",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{dist.name}</div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-tertiary)",
                              }}
                            >
                              {dist.percentage}%
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--success)",
                            }}
                          >
                            ${dist.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>No hay inversores registrados</div>
                  )}
                </>
              ) : (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--danger)",
                      marginBottom: 8,
                      fontWeight: 500,
                    }}
                  >
                    Sin ganancia para distribuir
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Pérdida:</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--danger)",
                      }}
                    >
                      ${Math.abs(dividendPreview.result).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div
              style={{
                fontSize: 12,
                color: "var(--danger)",
                background: "var(--danger-soft)",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--danger-border)",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid var(--border-default)",
                background: "transparent",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s",
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
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: "var(--success)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--accent-on)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                boxShadow: "0 2px 12px rgba(52, 211, 153, 0.2)",
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = "0 4px 20px rgba(52, 211, 153, 0.35)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(52, 211, 153, 0.2)")}
            >
              {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
