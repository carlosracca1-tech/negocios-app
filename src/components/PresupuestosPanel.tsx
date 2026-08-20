"use client";

import { useState, useEffect, useCallback } from "react";
import type { Partida, BudgetProjection } from "@/types";
import { partidasApi, cotizacionesApi, budgetApi } from "@/lib/api-client";
import { computeBudgetProjection, safe } from "@/lib/financial";
import KPICard from "./KPICard";
import PartidaCard from "./PartidaCard";
import PresupuestadoVsReal from "./PresupuestadoVsReal";
import AddPresupuestoModal from "./AddPresupuestoModal";

interface Props {
  projectId: string;
  projectType: string;
  buyPrice: number;
  totalExpenses: number;
  canEdit: boolean;
}

export default function PresupuestosPanel({ projectId, projectType, buyPrice, totalExpenses, canEdit }: Props) {
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [projection, setProjection] = useState<BudgetProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [elegirLoading, setElegirLoading] = useState(false);
  const [recomendandoId, setRecomendandoId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [p, b] = await Promise.all([
        partidasApi.list(projectId),
        budgetApi.getProjection(projectId),
      ]);
      setPartidas(p);
      setProjection(b);
    } catch (err) {
      console.error("Error fetching presupuestos:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleElegir = async (partidaId: string, cotId: string) => {
    setElegirLoading(true);
    try {
      await cotizacionesApi.elegir(projectId, partidaId, cotId);
      await fetchData();
    } catch (err) {
      window.alert("Error al elegir cotizacion: " + (err instanceof Error ? err.message : ""));
    } finally {
      setElegirLoading(false);
    }
  };

  const handleRecomendar = async (partidaId: string) => {
    setRecomendandoId(partidaId);
    try {
      await budgetApi.recomendar(projectId, partidaId);
      await fetchData();
    } catch (err) {
      window.alert("Error al obtener recomendacion: " + (err instanceof Error ? err.message : ""));
    } finally {
      setRecomendandoId(null);
    }
  };

  const totalProjected = projection?.totalProjected ?? 0;
  const totalExecuted = projection?.totalExecuted ?? 0;
  const deviation = projection?.deviation ?? 0;
  const costoFinal = safe(buyPrice) + totalProjected + safe(totalExpenses);
  const numRubros = partidas.length;
  const numCots = partidas.reduce((s, p) => s + (p.cotizaciones?.length || 0), 0);
  const pctExecuted = totalProjected > 0 ? (totalExecuted / totalProjected) * 100 : 0;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-tertiary)" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "3px solid var(--border-default)", borderTopColor: "var(--text-primary)",
          animation: "spin 1s linear infinite", margin: "0 auto 12px",
        }} />
        Cargando presupuestos...
      </div>
    );
  }

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid-4" style={{ gap: 12, marginBottom: 20 }}>
        <KPICard
          label="Costo proyectado total"
          value={`USD ${totalProjected.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          sub={`Cotizaciones elegidas · ${numRubros} rubros`}
          bold
        />
        <KPICard
          label="Ejecutado real"
          value={`USD ${totalExecuted.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          sub={`${pctExecuted.toFixed(0)}% del presupuesto`}
        />
        <KPICard
          label="Desvio acumulado"
          value={`${deviation >= 0 ? "+" : ""}USD ${Math.abs(deviation).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          sub={deviation >= 0 ? `${totalProjected > 0 ? ((deviation / totalProjected) * 100).toFixed(1) : 0}% bajo lo presupuestado` : "sobre lo presupuestado"}
          color={deviation >= 0 ? "var(--success)" : "var(--danger)"}
          subColor={deviation >= 0 ? "var(--success)" : "var(--danger)"}
        />
        <KPICard
          label="Costo final estimado"
          value={`USD ${costoFinal.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          sub={`Compra ${(buyPrice / 1000).toFixed(0)}k + obra proyectada`}
        />
      </div>

      {/* IA Analysis Banner */}
      {numCots >= 2 && (
        <div style={{
          display: "flex", gap: 15, alignItems: "flex-start",
          background: "linear-gradient(135deg, rgba(52,211,153,0.07), rgba(255,255,255,0.02))",
          border: "1px solid rgba(52,211,153,0.22)", borderRadius: 14,
          padding: "17px 19px", marginBottom: 22,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: "linear-gradient(135deg, #34d399, #10b981)",
            color: "#04130d", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, fontSize: 19,
          }}>
            ✦
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 5 }}>
              Analisis de N$
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
                color: "var(--success)", background: "var(--success-soft)",
                border: "1px solid rgba(52,211,153,0.3)",
                padding: "1px 7px", borderRadius: 20,
              }}>
                IA
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {numCots} cotizaciones cargadas en {numRubros} rubros. Costo de obra proyectado:{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                USD {totalProjected.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </strong>.
              {deviation > 0 && (
                <span>
                  {" "}Vas{" "}
                  <strong style={{ color: "var(--success)" }}>
                    USD {deviation.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </strong>{" "}
                  por debajo de lo presupuestado.
                </span>
              )}
            </div>
            {/* Per-partida recommendations */}
            {(() => {
              const recos = partidas
                .filter((p) => p.cotizaciones?.some((c) => c.aiRecommended))
                .slice(0, 3);
              if (recos.length === 0) return null;
              return (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 11 }}>
                  {recos.map((p) => {
                    const rec = p.cotizaciones?.find((c) => c.aiRecommended);
                    return (
                      <span key={p.id} style={{
                        fontSize: 11.5, background: "var(--surface-2)", border: "1px solid var(--border-default)",
                        borderRadius: 8, padding: "6px 10px", color: "var(--text-secondary)",
                        display: "flex", gap: 6, alignItems: "center",
                      }}>
                        <span style={{ color: "var(--success)" }}>✦</span>
                        {p.name}: <strong style={{ color: "var(--text-primary)" }}>{rec?.provider}</strong>
                      </span>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Upload hero */}
      {canEdit && (
        <div
          onClick={() => setShowModal(true)}
          style={{
            display: "flex", gap: 18, alignItems: "center",
            background: "var(--surface-1)", border: "1px dashed var(--border-default)",
            borderRadius: 14, padding: "18px 20px", marginBottom: 24,
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--text-tertiary)";
            e.currentTarget.style.background = "var(--surface-2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-default)";
            e.currentTarget.style.background = "var(--surface-1)";
          }}
        >
          <div style={{
            width: 50, height: 50, borderRadius: 13, background: "var(--surface-3)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>
              Subi el presupuesto en PDF y yo lo analizo
            </h3>
            <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
              Arrastra el PDF del proveedor.{" "}
              <span style={{ color: "var(--success)", fontWeight: 600 }}>
                Extraigo el alcance, los valores y los tiempos, lo cargo al rubro correcto y te digo si conviene.
              </span>
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
            style={{
              marginLeft: "auto", flexShrink: 0,
              padding: "8px 14px", borderRadius: 8, border: "none",
              background: "var(--accent)", color: "var(--accent-on)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Subir PDF
          </button>
        </div>
      )}

      {/* Comparador por rubro */}
      {partidas.length > 0 && (
        <>
          <div style={{
            fontSize: 14, fontWeight: 600, margin: "6px 0 14px",
            display: "flex", alignItems: "center", gap: 10,
            color: "var(--text-primary)",
          }}>
            Comparador por rubro
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 400 }}>
              — cada rubro con sus cotizaciones lado a lado
            </span>
            <span style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
          </div>

          {partidas.map((p) => (
            <PartidaCard
              key={p.id}
              partida={p}
              onElegir={handleElegir}
              onRecomendar={handleRecomendar}
              loading={elegirLoading}
              recomendando={recomendandoId === p.id}
            />
          ))}
        </>
      )}

      {/* Presupuestado vs Real */}
      {projection && projection.byRubro.length > 0 && (
        <>
          <div style={{
            fontSize: 14, fontWeight: 600, margin: "28px 0 14px",
            display: "flex", alignItems: "center", gap: 10,
            color: "var(--text-primary)",
          }}>
            Presupuestado vs. Real
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 400 }}>
              — cuánto llevás pagado de cada presupuesto, en pesos
            </span>
            <span style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
          </div>
          <PresupuestadoVsReal projection={projection} />
        </>
      )}

      {/* Empty state */}
      {partidas.length === 0 && (
        <div style={{
          textAlign: "center", padding: "40px 16px",
          background: "var(--surface-1)", borderRadius: 12,
          border: "1px dashed var(--border-default)",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
            Sin presupuestos todavia
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-tertiary)", marginBottom: 16, lineHeight: 1.5 }}>
            Subi el primer PDF de un proveedor y la IA lo analiza automaticamente.
          </div>
          {canEdit && (
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: "var(--accent)", color: "var(--accent-on)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              + Subir presupuesto
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      <AddPresupuestoModal
        projectId={projectId}
        projectType={projectType}
        partidas={partidas}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
