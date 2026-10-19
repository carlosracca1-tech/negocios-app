"use client";

import { useState } from "react";
import { useGrantAccess } from "@/hooks/useProjects";
import { modalInputStyle as inputStyle } from "@/lib/constants";
import { useModalA11y } from "@/hooks/useModalA11y";

interface ShareModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ShareModal({ projectId, isOpen, onClose, onSuccess }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ver" | "interactuar">("ver");
  const { mutate, loading, error } = useGrantAccess();
  const { panelRef, handleKeyDown } = useModalA11y(isOpen, onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutate(projectId, { email, role });
      setEmail("");
      setRole("ver");
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
      aria-labelledby="share-modal-title"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        className="modal-panel"
        style={{ width: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="share-modal-title" className="modal-title">Compartir proyecto</h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label htmlFor="share-email" className="modal-label">Email</label>
            <input
              id="share-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@example.com"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="share-role" className="modal-label">Rol</label>
            <select
              id="share-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "ver" | "interactuar")}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="ver">Solo ver</option>
              <option value="interactuar">Ver + Interactuar</option>
            </select>
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
