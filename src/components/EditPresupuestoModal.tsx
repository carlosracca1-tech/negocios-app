"use client";

import { useState, useEffect } from "react";
import type { Partida, Cotizacion } from "@/types";
import { partidasApi, cotizacionesApi } from "@/lib/api-client";
import { categoriesByProjectType, modalInputStyle, focusInput, blurInput } from "@/lib/constants";

interface Props {
  projectId: string;
  projectType: string;
  partida: Partida | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/** Borrador editable de una cotizacion (todo string para que el input se comporte bien). */
interface CotDraft {
  id: string;
  provider: string;
  amount: string;
  currency: "ARS" | "USD";
  exchangeRate: string;
  isChosen: boolean;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "var(--text-tertiary)",
  marginBottom: 6,
};

const toDraft = (c: Cotizacion): CotDraft => ({
  id: c.id,
  provider: c.provider || "",
  amount: c.amount != null ? String(c.amount) : "",
  currency: (c.currency === "ARS" ? "ARS" : "USD") as "ARS" | "USD",
  exchangeRate: c.exchangeRate != null ? String(c.exchangeRate) : "",
  isChosen: Boolean(c.isChosen),
});

const num = (s: string): number | null => {
  const n = Number(String(s).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export default function EditPresupuestoModal({
  projectId, projectType, partida, isOpen, onClose, onSuccess,
}: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [cots, setCots] = useState<CotDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = categoriesByProjectType[projectType] || categoriesByProjectType.Casa;

  // Cada vez que se abre con una partida, recargamos el borrador desde los datos reales.
  useEffect(() => {
    if (!isOpen || !partida) return;
    setName(partida.name || "");
    setCategory(partida.category || "");
    setDescription(partida.description || "");
    setCots(((partida.cotizaciones || []) as Cotizacion[]).map(toDraft));
    setError(null);
  }, [isOpen, partida]);

  if (!isOpen || !partida) return null;

  const patchCot = (id: string, patch: Partial<CotDraft>) =>
    setCots((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const handleSave = async () => {
    if (!name.trim()) {
      setError("El nombre del rubro no puede quedar vacio.");
      return;
    }
    for (const c of cots) {
      if (!c.provider.trim()) {
        setError("Cada cotizacion necesita un proveedor.");
        return;
      }
      if (num(c.amount) === null) {
        setError(`El monto de "${c.provider}" tiene que ser un numero mayor a 0.`);
        return;
      }
      if (c.currency === "ARS" && num(c.exchangeRate) === null) {
        setError(`Cargá el tipo de cambio de "${c.provider}" para poder verlo en USD.`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const originales = (partida.cotizaciones || []) as Cotizacion[];

      const cambioPartida =
        name.trim() !== (partida.name || "") ||
        category !== (partida.category || "") ||
        description.trim() !== (partida.description || "");

      if (cambioPartida) {
        await partidasApi.update(projectId, partida.id, {
          name: name.trim(),
          category,
          description: description.trim() || null,
        });
      }

      for (const c of cots) {
        const orig = originales.find((o) => o.id === c.id);
        if (!orig) continue;
        const amount = num(c.amount) as number;
        const rate = c.currency === "ARS" ? num(c.exchangeRate) : null;
        const sinCambios =
          c.provider.trim() === (orig.provider || "") &&
          amount === orig.amount &&
          c.currency === orig.currency &&
          rate === (orig.exchangeRate ?? null);
        if (sinCambios) continue;

        await cotizacionesApi.update(projectId, partida.id, c.id, {
          provider: c.provider.trim(),
          amount,
          currency: c.currency,
          exchangeRate: rate,
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError("No se pudo guardar: " + (err instanceof Error ? err.message : "error desconocido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(5px)", display: "flex", alignItems: "flex-start",
        justifyContent: "center", zIndex: 50, padding: "24px 16px", overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "var(--surface-solid)", border: "1px solid var(--border-default)",
          borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "calc(100vh - 48px)",
          margin: "auto", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-elevated)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "17px 20px", borderBottom: "1px solid var(--border-default)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, background: "var(--surface-solid)",
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 9, color: "var(--text-primary)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Editar presupuesto
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 22, cursor: saving ? "wait" : "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: "auto", flex: 1, minHeight: 0 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nombre del rubro</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={focusInput}
              onBlur={blurInput}
              style={modalInputStyle}
              placeholder="Ej: Albañil Juan #1 - Reforma integral"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onFocus={focusInput}
              onBlur={blurInput}
              style={{ ...modalInputStyle, cursor: "pointer" }}
            >
              {!categories.some((c) => c.value === category) && category && (
                <option value={category}>{category}</option>
              )}
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ ...modalInputStyle, resize: "vertical", fontFamily: "inherit" }}
              placeholder="Detalle del trabajo, aclaraciones, adicionales..."
            />
          </div>

          <div style={{
            borderTop: "1px solid var(--border-faint)", paddingTop: 16,
          }}>
            <div style={{ ...labelStyle, marginBottom: 4 }}>Cotizaciones</div>
            <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginBottom: 14, lineHeight: 1.5 }}>
              El monto de la cotización <strong>elegida</strong> es el que se usa en Presupuestado vs Real.
              Si se agregó algo de último momento, actualizá ese número acá.
            </div>

            {cots.length === 0 && (
              <div style={{ fontSize: 12.5, color: "var(--text-tertiary)", padding: "12px 0" }}>
                Este rubro todavía no tiene cotizaciones cargadas.
              </div>
            )}

            {cots.map((c) => (
              <div
                key={c.id}
                style={{
                  border: c.isChosen ? "1px solid var(--success-border)" : "1px solid var(--border-faint)",
                  background: c.isChosen ? "var(--success-soft)" : "var(--surface-1)",
                  borderRadius: 12, padding: 14, marginBottom: 12,
                }}
              >
                {c.isChosen && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6,
                    color: "var(--success)", marginBottom: 10,
                  }}>
                    ✓ Elegida — es la que cuenta
                  </div>
                )}

                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Proveedor</label>
                  <input
                    value={c.provider}
                    onChange={(e) => patchCot(c.id, { provider: e.target.value })}
                    onFocus={focusInput}
                    onBlur={blurInput}
                    style={modalInputStyle}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Monto</label>
                    <input
                      value={c.amount}
                      onChange={(e) => patchCot(c.id, { amount: e.target.value })}
                      onFocus={focusInput}
                      onBlur={blurInput}
                      inputMode="decimal"
                      style={{ ...modalInputStyle, fontVariantNumeric: "tabular-nums" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Moneda</label>
                    <select
                      value={c.currency}
                      onChange={(e) => patchCot(c.id, { currency: e.target.value as "ARS" | "USD" })}
                      onFocus={focusInput}
                      onBlur={blurInput}
                      style={{ ...modalInputStyle, cursor: "pointer" }}
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                {c.currency === "ARS" && (
                  <div style={{ marginTop: 10 }}>
                    <label style={labelStyle}>Tipo de cambio (para verlo en USD)</label>
                    <input
                      value={c.exchangeRate}
                      onChange={(e) => patchCot(c.id, { exchangeRate: e.target.value })}
                      onFocus={focusInput}
                      onBlur={blurInput}
                      inputMode="decimal"
                      style={{ ...modalInputStyle, fontVariantNumeric: "tabular-nums" }}
                      placeholder="1540"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div style={{
              background: "var(--danger-soft)", border: "1px solid var(--danger-border)",
              borderRadius: 10, padding: "10px 12px", fontSize: 12.5,
              color: "var(--danger)", marginTop: 4,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px", borderTop: "1px solid var(--border-default)",
          display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              background: "transparent", border: "1px solid var(--border-strong)",
              borderRadius: 10, padding: "10px 16px", fontSize: 12.5, fontWeight: 600,
              color: "var(--text-secondary)", cursor: saving ? "wait" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: "var(--accent)", border: "none", borderRadius: 10,
              padding: "10px 18px", fontSize: 12.5, fontWeight: 700,
              color: "var(--accent-on)", cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
