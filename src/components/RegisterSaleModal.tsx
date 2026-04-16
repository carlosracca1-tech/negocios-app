"use client";

import { useState, useMemo } from "react";
import { useUpdateProject } from "@/hooks/useProjects";
import { Investor } from "@/types";

interface RegisterSaleModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  investors?: Investor[];
  totalInvestment?: number;
}

export default function RegisterSaleModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
  investors = [],
  totalInvestment = 0,
}: RegisterSaleModalProps) {
  const [salePrice, setSalePrice] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const { mutate, loading, error } = useUpdateProject();

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

      if (saleDate) {
        updateData.saleDate = new Date(saleDate).toISOString();
      }

      if (buyerName.trim()) {
        updateData.buyerName = buyerName.trim();
      }

      await mutate(projectId, updateData);
      setSalePrice("");
      setSaleDate("");
      setBuyerName("");
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
        background: "rgba(6, 11, 20, 0.7)",
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
          background: "rgba(12, 21, 36, 0.95)",
          backdropFilter: "blur(20px)",
          borderRadius: 16,
          padding: 24,
          width: 500,
          maxWidth: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(52, 211, 153, 0.1), 0 0 40px rgba(52, 211, 153, 0.05)",
          border: "1px solid rgba(52, 211, 153, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8edf5", marginBottom: 16 }}>
          Registrar venta
        </h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Sale Price */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 600,
                color: "#5a6b82",
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
                border: "1px solid rgba(52, 211, 153, 0.15)",
                backgroundColor: "rgba(6, 11, 20, 0.6)",
                fontSize: 13,
                outline: "none",
                color: "#e8edf5",
                transition: "all 0.25s",
                backdropFilter: "blur(8px)",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#34d399";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(52, 211, 153, 0.1), 0 0 15px rgba(52, 211, 153, 0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(52, 211, 153, 0.15)";
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
                color: "#5a6b82",
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
                border: "1px solid rgba(52, 211, 153, 0.15)",
                backgroundColor: "rgba(6, 11, 20, 0.6)",
                fontSize: 13,
                outline: "none",
                color: "#e8edf5",
                transition: "all 0.25s",
                backdropFilter: "blur(8px)",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#34d399";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(52, 211, 153, 0.1), 0 0 15px rgba(52, 211, 153, 0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(52, 211, 153, 0.15)";
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
                color: "#5a6b82",
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
                border: "1px solid rgba(52, 211, 153, 0.15)",
                backgroundColor: "rgba(6, 11, 20, 0.6)",
                fontSize: 13,
                outline: "none",
                color: "#e8edf5",
                transition: "all 0.25s",
                backdropFilter: "blur(8px)",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#34d399";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(52, 211, 153, 0.1), 0 0 15px rgba(52, 211, 153, 0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(52, 211, 153, 0.15)";
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
                  color: "#34d399",
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
                      borderBottom: "1px solid rgba(52, 211, 153, 0.15)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "#8899b0" }}>Precio de venta:</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e8edf5" }}>
                        ${parseFloat(salePrice).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "#8899b0" }}>Inversión total:</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e8edf5" }}>
                        ${totalInvestment.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#34d399" }}>Resultado:</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>
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
                          color: "#5a6b82",
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
                            <div style={{ fontSize: 12, color: "#e8edf5", fontWeight: 500 }}>{dist.name}</div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#5a6b82",
                              }}
                            >
                              {dist.percentage}%
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#34d399",
                            }}
                          >
                            ${dist.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "#8899b0" }}>No hay inversores registrados</div>
                  )}
                </>
              ) : (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#f87171",
                      marginBottom: 8,
                      fontWeight: 500,
                    }}
                  >
                    Sin ganancia para distribuir
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#8899b0" }}>Pérdida:</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#f87171",
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
                color: "#f87171",
                background: "rgba(248, 113, 113, 0.08)",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid rgba(248, 113, 113, 0.15)",
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
                border: "1px solid rgba(56, 189, 248, 0.12)",
                background: "transparent",
                fontSize: 13,
                fontWeight: 600,
                color: "#8899b0",
                cursor: "pointer",
                transition: "all 0.2s",
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
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #34d399, #6ee7b7)",
                fontSize: 13,
                fontWeight: 600,
                color: "#060b14",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                boxShadow: "0 2px 12px rgba(52, 211, 153, 0.2)",
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = "0 4px 20px rgba(52, 211, 153, 0.35)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(52, 211, 153, 0.2)")}
            >
              {loading ? "Registrando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
