"use client";

import type { Cotizacion, ScopeItem } from "@/types";
import { cotizacionUsd } from "@/lib/financial";

interface Props {
  cot: Cotizacion;
  minUsd: number;
  onElegir: (cotId: string) => void;
  loading?: boolean;
}

export default function CotizacionCard({ cot, minUsd, onElegir, loading }: Props) {
  const usd = cotizacionUsd(cot);
  const isMin = usd <= minUsd && minUsd > 0;
  const delta = minUsd > 0 && usd > minUsd ? ((usd - minUsd) / minUsd) * 100 : 0;
  const scope = (cot.scopeItems || []) as ScopeItem[];
  const initials = cot.provider
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const borderColor = cot.isChosen
    ? "var(--accent)"
    : cot.aiRecommended
    ? "rgba(52, 211, 153, 0.45)"
    : "var(--border-default)";

  const boxShadow = cot.isChosen ? "0 0 0 1px var(--accent) inset" : "none";

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: `1px solid ${borderColor}`,
        borderRadius: 11,
        overflow: "hidden",
        position: "relative",
        transition: "all 0.18s",
        display: "flex",
        flexDirection: "column",
        boxShadow,
      }}
    >
      {/* Ribbon */}
      {(isMin || cot.aiRecommended) && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: -31,
            transform: "rotate(45deg)",
            background: "var(--success)",
            color: "#04130d",
            fontSize: 9,
            fontWeight: 700,
            padding: "3px 34px",
            letterSpacing: 0.5,
            zIndex: 1,
          }}
        >
          {isMin ? "MAS BARATA" : "MEJOR"}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "14px 15px 12px", borderBottom: "1px solid var(--border-default)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "var(--surface-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-primary)",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>{cot.provider}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>
              {cot.validityDays ? `vig. ${cot.validityDays} dias` : ""}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span
            className="tabular"
            style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.5, color: "var(--text-primary)" }}
          >
            USD {usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
          {isMin ? (
            <span
              style={{
                fontSize: 10.5,
                padding: "2px 7px",
                borderRadius: 6,
                fontWeight: 600,
                background: "var(--success-soft)",
                color: "var(--success)",
              }}
            >
              mas barata
            </span>
          ) : delta > 0 ? (
            <span
              style={{
                fontSize: 10.5,
                padding: "2px 7px",
                borderRadius: 6,
                fontWeight: 600,
                background: "var(--danger-soft)",
                color: "var(--danger)",
              }}
            >
              +{delta.toFixed(1)}%
            </span>
          ) : null}
        </div>
        {cot.currency === "ARS" && (
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
            AR$ {cot.amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </div>
        )}
      </div>

      {/* Rows */}
      <div style={{ padding: "12px 15px", flex: 1 }}>
        {scope.length > 0 && (
          <div style={{ display: "flex", gap: 9, padding: "7px 0", borderBottom: "1px solid var(--border-faint)", fontSize: 12 }}>
            <span style={{ color: "var(--text-tertiary)", width: 60, flexShrink: 0 }}>Alcance</span>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
              {scope.map((s, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "flex-start",
                    color: s.included ? "var(--text-secondary)" : "var(--text-tertiary)",
                    textDecoration: s.included ? "none" : "line-through",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: s.included ? "var(--success)" : "var(--danger)", fontWeight: 700 }}>
                    {s.included ? "\u2713" : "\u2715"}
                  </span>
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(cot.leadTimeText || cot.leadTimeDays) && (
          <div style={{ display: "flex", gap: 9, padding: "7px 0", borderBottom: "1px solid var(--border-faint)", fontSize: 12 }}>
            <span style={{ color: "var(--text-tertiary)", width: 60, flexShrink: 0 }}>Tiempo</span>
            <span style={{ color: "var(--text-secondary)" }}>
              {cot.leadTimeText || `${cot.leadTimeDays} dias`}
            </span>
          </div>
        )}
        {cot.paymentTerms && (
          <div style={{ display: "flex", gap: 9, padding: "7px 0", borderBottom: "1px solid var(--border-faint)", fontSize: 12 }}>
            <span style={{ color: "var(--text-tertiary)", width: 60, flexShrink: 0 }}>Pago</span>
            <span style={{ color: "var(--text-secondary)" }}>{cot.paymentTerms}</span>
          </div>
        )}
        {cot.warranty && (
          <div style={{ display: "flex", gap: 9, padding: "7px 0", fontSize: 12 }}>
            <span style={{ color: "var(--text-tertiary)", width: 60, flexShrink: 0 }}>Garantia</span>
            <span style={{ color: "var(--text-secondary)" }}>{cot.warranty}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "11px 15px",
          borderTop: "1px solid var(--border-default)",
          display: "flex",
          gap: 8,
        }}
      >
        <button
          onClick={() => onElegir(cot.id)}
          disabled={loading}
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 8,
            border: cot.isChosen ? "1px solid var(--accent)" : "1px solid var(--border-default)",
            background: cot.isChosen ? "var(--accent)" : "transparent",
            color: cot.isChosen ? "var(--accent-on)" : "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {cot.isChosen ? "\u2713 Elegida" : "Elegir esta"}
        </button>
        {cot.fileUrl && (
          <a
            href={cot.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 11px",
              borderRadius: 8,
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-tertiary)",
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              textDecoration: "none",
            }}
          >
            PDF
          </a>
        )}
      </div>
    </div>
  );
}
