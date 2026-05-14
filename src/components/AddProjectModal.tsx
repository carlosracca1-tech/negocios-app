"use client";

import { useState } from "react";
import { useCreateProject } from "@/hooks/useProjects";
import { modalInputStyle as inputStyle, focusInput, blurInput } from "@/lib/constants";

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddProjectModal({ isOpen, onClose, onSuccess }: AddProjectModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"Casa" | "Auto">("Casa");
  const [buyPrice, setBuyPrice] = useState("");
  const [buyDate, setBuyDate] = useState(new Date().toISOString().split("T")[0]);
  const [address, setAddress] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const { mutate, loading, error } = useCreateProject();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutate({
        name,
        type,
        buyPrice: parseFloat(buyPrice),
        buyDate: new Date(buyDate).toISOString(),
        address: address || undefined,
        listingPrice: listingPrice ? parseFloat(listingPrice) : undefined,
      });
      setName("");
      setType("Casa");
      setBuyPrice("");
      setBuyDate(new Date().toISOString().split("T")[0]);
      setAddress("");
      setListingPrice("");
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
          width: 420,
          maxWidth: "90%",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 189, 248, 0.1), 0 0 40px rgba(56, 189, 248, 0.05)",
          border: "1px solid var(--border-default)",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Nuevo proyecto</h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Nombre</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Casa Núñez" required style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value as "Casa" | "Auto")} style={{ ...inputStyle, cursor: "pointer" }} onFocus={focusInput} onBlur={blurInput}>
                <option value="Casa">Casa</option>
                <option value="Auto">Auto</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Fecha compra</label>
              <input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Precio compra</label>
            <input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0" step="0.01" min="0" required style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>

          {type === "Casa" && (
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Dirección</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Opcional" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Valor de publicación (opcional)</label>
            <input type="number" value={listingPrice} onChange={(e) => setListingPrice(e.target.value)} placeholder="0" step="0.01" min="0" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>

          {error && <div style={{ fontSize: 12, color: "var(--danger)", background: "var(--danger-soft)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--danger-border)" }}>{error}</div>}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border-default)", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-1)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.12)"; }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", background: "var(--accent)", fontSize: 13, fontWeight: 600, color: "var(--accent-on)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, boxShadow: "0 2px 12px rgba(56, 189, 248, 0.2)" }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = "0 4px 20px rgba(56, 189, 248, 0.35)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(56, 189, 248, 0.2)")}>
              {loading ? "Creando..." : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
