"use client";

import { useState } from "react";
import { useGrantAccess } from "@/hooks/useProjects";
import { modalInputStyle as inputStyle } from "@/lib/constants";

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
          width: 400,
          maxWidth: "90%",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 189, 248, 0.1), 0 0 40px rgba(56, 189, 248, 0.05)",
          border: "1px solid rgba(56, 189, 248, 0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8edf5", marginBottom: 16 }}>Compartir proyecto</h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#5a6b82", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@example.com"
              required
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#38bdf8";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(56, 189, 248, 0.1), 0 0 15px rgba(56, 189, 248, 0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#5a6b82", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Rol
            </label>
            <select value={role} onChange={(e) => setRole(e.target.value as "ver" | "interactuar")} style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#38bdf8";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(56, 189, 248, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.1)";
                e.currentTarget.style.boxShadow = "none";
              }}>
              <option value="ver">Solo ver</option>
              <option value="interactuar">Ver + Interactuar</option>
            </select>
          </div>

          {error && <div style={{ fontSize: 12, color: "#f87171", background: "rgba(248, 113, 113, 0.08)", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(248, 113, 113, 0.15)" }}>{error}</div>}

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
                background: "linear-gradient(135deg, #38bdf8, #7dd3fc)",
                fontSize: 13,
                fontWeight: 600,
                color: "#060b14",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                boxShadow: "0 2px 12px rgba(56, 189, 248, 0.2)",
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = "0 4px 20px rgba(56, 189, 248, 0.35)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(56, 189, 248, 0.2)")}
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
