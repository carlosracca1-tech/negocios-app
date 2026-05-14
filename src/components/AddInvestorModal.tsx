"use client";

import { useState, useEffect } from "react";
import { investorsApi, usersApi } from "@/lib/api-client";
import { User } from "@/types";
import { modalInputStyle as inputStyle, focusInput, blurInput } from "@/lib/constants";

interface AddInvestorModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddInvestorModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: AddInvestorModalProps) {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [capitalPercentage, setCapitalPercentage] = useState("");
  const [profitPercentage, setProfitPercentage] = useState("");
  const [amountInvested, setAmountInvested] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

  // Fetch users on mount
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const data = await usersApi.list();
        setUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen]);

  const resetForm = () => {
    setName("");
    setUserId(null);
    setCapitalPercentage("");
    setProfitPercentage("");
    setAmountInvested("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!name.trim()) {
      setError("El nombre del inversor es requerido");
      return;
    }
    if (!capitalPercentage || isNaN(parseFloat(capitalPercentage))) {
      setError("El porcentaje de capital es requerido");
      return;
    }
    if (!profitPercentage || isNaN(parseFloat(profitPercentage))) {
      setError("El porcentaje de ganancia es requerido");
      return;
    }

    const capPct = parseFloat(capitalPercentage);
    const profPct = parseFloat(profitPercentage);

    if (capPct < 0 || capPct > 100) {
      setError("El porcentaje de capital debe estar entre 0 y 100");
      return;
    }
    if (profPct < 0 || profPct > 100) {
      setError("El porcentaje de ganancia debe estar entre 0 y 100");
      return;
    }

    try {
      setLoading(true);
      await investorsApi.add(projectId, {
        name: name.trim(),
        capitalPercentage: capPct,
        profitPercentage: profPct,
        amountInvested: amountInvested ? parseFloat(amountInvested) : 0,
        userId: userId || null,
      });

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al agregar inversor";
      setError(message);
    } finally {
      setLoading(false);
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
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          background: "var(--surface-glass)",
          backdropFilter: "blur(20px)",
          borderRadius: 16,
          padding: 24,
          width: 520,
          maxWidth: "92vw",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow:
            "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 189, 248, 0.1), 0 0 40px rgba(56, 189, 248, 0.05)",
          border: "1px solid var(--border-default)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
          Agregar inversor
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 20 }}>
          Define el porcentaje de capital y ganancia que recibirá este inversor en el proyecto.
        </p>

        {/* Explanation */}
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
            borderRadius: 10,
            padding: 12,
            marginBottom: 20,
            fontSize: 11,
            color: "var(--text-primary)",
            lineHeight: 1.5,
          }}
        >
          <strong>Capital (%)</strong>: Porcentaje de la inversión inicial que aportó. Es la proporción del dinero invertido.
          <br />
          <br />
          <strong>Ganancia (%)</strong>: Porcentaje de las ganancias que recibirá cuando se venda el proyecto. Puede ser diferente del capital.
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              Nombre del inversor
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Juan Pérez, Empresa S.A."
              required
              style={inputStyle}
              onFocus={focusInput}
              onBlur={blurInput}
            />
          </div>

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
              Vincular a usuario (opcional)
            </label>
            <select
              value={userId || ""}
              onChange={(e) => setUserId(e.target.value || null)}
              style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={focusInput}
              onBlur={blurInput}
              disabled={usersLoading}
            >
              <option value="">— Sin vincular —</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
                Capital (%)
              </label>
              <input
                type="number"
                value={capitalPercentage}
                onChange={(e) => setCapitalPercentage(e.target.value)}
                placeholder="0"
                step="0.1"
                min="0"
                max="100"
                required
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>
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
                Ganancia (%)
              </label>
              <input
                type="number"
                value={profitPercentage}
                onChange={(e) => setProfitPercentage(e.target.value)}
                placeholder="0"
                step="0.1"
                min="0"
                max="100"
                required
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>
          </div>

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
              Monto invertido ($) — opcional
            </label>
            <input
              type="number"
              value={amountInvested}
              onChange={(e) => setAmountInvested(e.target.value)}
              placeholder="0"
              step="0.01"
              min="0"
              style={inputStyle}
              onFocus={focusInput}
              onBlur={blurInput}
            />
            {amountInvested && (
              <div style={{ fontSize: 11, color: "var(--text-primary)", marginTop: 4 }}>
                USD{" "}
                {parseFloat(amountInvested).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            )}
          </div>

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

          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
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
                background: "var(--accent)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--accent-on)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                boxShadow: "0 2px 12px rgba(56, 189, 248, 0.2)",
              }}
              onMouseEnter={(e) =>
                !loading &&
                (e.currentTarget.style.boxShadow = "0 4px 20px rgba(56, 189, 248, 0.35)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow = "0 2px 12px rgba(56, 189, 248, 0.2)")
              }
            >
              {loading ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
