"use client";

import { useState } from "react";
import type { Partida, Cotizacion } from "@/types";
import { cotizacionUsd } from "@/lib/financial";
import { catColors } from "@/lib/constants";
import CotizacionCard from "./CotizacionCard";

interface Props {
  partida: Partida;
  onElegir: (partidaId: string, cotId: string) => void;
  onRecomendar: (partidaId: string) => void;
  loading?: boolean;
  recomendando?: boolean;
}

const catIcons: Record<string, string> = {
  Obra: "🧱", Estructura: "🏗️", Terminaciones: "🎨", Equipamiento: "🔌",
  Exterior: "🌿", Profesionales: "👷", Servicios: "💡", Documentacion: "📄",
  Documentación: "📄", Mecanica: "🔧", Mecánica: "🔧", Motor: "⚙️",
  Carroceria: "🚗", Carrocería: "🚗", Interior: "💺", Electronica: "📡",
  Electrónica: "📡", Neumaticos: "🛞", Neumáticos: "🛞",
};

export default function PartidaCard({ partida, onElegir, onRecomendar, loading, recomendando }: Props) {
  const [open, setOpen] = useState(false);
  const cots = (partida.cotizaciones || []) as Cotizacion[];
  const usds = cots.map(cotizacionUsd);
  const minUsd = usds.length > 0 ? Math.min(...usds) : 0;
  const maxUsd = usds.length > 0 ? Math.max(...usds) : 0;
  const chosen = cots.find((c) => c.isChosen);
  const recommended = cots.find((c) => c.aiRecommended);
  const icon = catIcons[partida.category] || "📋";

  const fmtK = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  };

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-faint)",
        borderRadius: 12,
        marginBottom: 13,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "14px 16px",
          cursor: "pointer",
          flexWrap: "wrap",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: catColors[partida.category] ? `${catColors[partida.category]}18` : "var(--surface-3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{partida.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>
            {partida.category} · {cots.length} cotizacion{cots.length !== 1 ? "es" : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          {recommended && (
            <span style={{
              background: "var(--accent-soft)", color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
              padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              display: "inline-flex", gap: 4, alignItems: "center", whiteSpace: "nowrap",
            }}>
              ✦ N$ recomienda: {recommended.provider}
            </span>
          )}
          {!chosen && !recommended && cots.length === 0 && (
            <span style={{
              background: "var(--surface-3)", color: "var(--text-secondary)",
              padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
            }}>
              Sin cotizaciones
            </span>
          )}
          {!chosen && cots.length > 0 && !recommended && (
            <span style={{
              background: "var(--surface-3)", color: "var(--text-secondary)",
              padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
            }}>
              Sin elegir
            </span>
          )}

          {cots.length >= 2 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-tertiary)" }}>Rango</div>
              <div className="tabular" style={{ fontSize: 14.5, fontWeight: 700, marginTop: 2, color: "var(--text-primary)" }}>
                {fmtK(minUsd)}–{fmtK(maxUsd)}
              </div>
            </div>
          )}

          {chosen && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-tertiary)" }}>Elegido</div>
              <div className="tabular" style={{ fontSize: 14.5, fontWeight: 700, marginTop: 2, color: "var(--success)" }}>
                USD {cotizacionUsd(chosen).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
          )}
        </div>

        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"
          style={{ transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "none", flexShrink: 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* Body */}
      {open && (
        <div style={{ borderTop: "1px solid var(--border-default)", padding: 16 }}>
          {/* AI recommendation strip */}
          {recommended?.aiReasoning && (
            <div style={{
              display: "flex", gap: 11, alignItems: "flex-start",
              background: "var(--success-soft)", border: "1px solid var(--success-border)",
              borderRadius: 10, padding: "11px 13px", marginBottom: 15,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 7,
                background: "linear-gradient(135deg, #34d399, #10b981)",
                color: "#04130d", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, flexShrink: 0,
              }}>
                ✦
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>
                {recommended.aiReasoning}
              </div>
            </div>
          )}

          {/* Recomendar button */}
          {cots.length >= 2 && !recommended && (
            <button
              onClick={() => onRecomendar(partida.id)}
              disabled={recomendando}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--success-soft)", border: "1px solid var(--success-border)",
                borderRadius: 10, padding: "10px 14px", marginBottom: 15,
                cursor: recomendando ? "wait" : "pointer", fontSize: 12.5, fontWeight: 600,
                color: "var(--success)", width: "100%", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              ✦ {recomendando ? "Analizando..." : "Pedir recomendacion de N$"}
            </button>
          )}

          {/* Cotizaciones grid */}
          <div style={{
            display: "grid", gap: 13,
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          }}>
            {cots.map((c) => (
              <CotizacionCard
                key={c.id}
                cot={c}
                minUsd={minUsd}
                onElegir={(cotId) => onElegir(partida.id, cotId)}
                loading={loading}
              />
            ))}
          </div>

          {cots.length === 0 && (
            <div style={{
              textAlign: "center", padding: "24px 16px",
              color: "var(--text-tertiary)", fontSize: 13,
            }}>
              Sin cotizaciones todavia. Subi un PDF para agregar una.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
