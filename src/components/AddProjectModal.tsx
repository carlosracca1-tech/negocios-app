"use client";

import { useState } from "react";
import { useCreateProject } from "@/hooks/useProjects";
import { modalInputStyle as inputStyle, focusInput, blurInput } from "@/lib/constants";
import { useModalA11y } from "@/hooks/useModalA11y";

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
  const { panelRef, handleKeyDown } = useModalA11y(isOpen, onClose);

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
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="addproject-modal-title"
      onKeyDown={handleKeyDown}
      onClick={onClose}
    >
      <div
        className="modal-panel"
        ref={panelRef}
        style={{ width: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="addproject-modal-title" className="modal-title">Nuevo proyecto</h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label htmlFor="addproject-name" className="modal-label">Nombre</label>
            <input id="addproject-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Casa Núñez" required style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label htmlFor="addproject-type" className="modal-label">Tipo</label>
              <select id="addproject-type" value={type} onChange={(e) => setType(e.target.value as "Casa" | "Auto")} style={{ ...inputStyle, cursor: "pointer" }} onFocus={focusInput} onBlur={blurInput}>
                <option value="Casa">Casa</option>
                <option value="Auto">Auto</option>
              </select>
            </div>
            <div>
              <label htmlFor="addproject-buydate" className="modal-label">Fecha compra</label>
              <input id="addproject-buydate" type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
          </div>

          <div>
            <label htmlFor="addproject-buyprice" className="modal-label">Precio compra</label>
            <input id="addproject-buyprice" type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0" step="0.01" min="0" required style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>

          {type === "Casa" && (
            <div>
              <label htmlFor="addproject-address" className="modal-label">Dirección</label>
              <input id="addproject-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Opcional" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
          )}

          <div>
            <label htmlFor="addproject-listingprice" className="modal-label">Valor de publicación (opcional)</label>
            <input id="addproject-listingprice" type="number" value={listingPrice} onChange={(e) => setListingPrice(e.target.value)} placeholder="0" step="0.01" min="0" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Creando..." : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
