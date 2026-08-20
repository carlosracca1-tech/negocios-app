"use client";

import { useState, useEffect, useCallback } from "react";
import { costsApi, type AutoImputarResultado } from "@/lib/api-client";

interface Props {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AutoImputarModal({ projectId, isOpen, onClose, onSuccess }: Props) {
  const [plan, setPlan] = useState<AutoImputarResultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const pedirPlan = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setPlan(await costsApi.autoImputar(projectId, false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo calcular la imputación");
    } finally {
      setCargando(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      setPlan(null);
      setListo(false);
      setError(null);
      pedirPlan();
    }
  }, [isOpen, pedirPlan]);

  const aplicar = async () => {
    setAplicando(true);
    setError(null);
    try {
      const r = await costsApi.autoImputar(projectId, true);
      setPlan(r);
      setListo(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aplicar");
    } finally {
      setAplicando(false);
    }
  };

  if (!isOpen) return null;

  const fmtArs = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

  // Agrupado por presupuesto, para que se lea de un vistazo.
  const porPartida = new Map<
    string,
    { nombre: string; items: { concept: string; montoArs: number; porCascada?: boolean; excede?: boolean }[] }
  >();
  (plan?.imputar || []).forEach((i) => {
    const g = porPartida.get(i.partidaId) || { nombre: i.partidaName, items: [] };
    g.items.push({ concept: i.concept, montoArs: i.montoArs, porCascada: i.porCascada, excede: i.excede });
    porPartida.set(i.partidaId, g);
  });

  const resumenPorId = new Map((plan?.resumen || []).map((r) => [r.partidaId, r]));
  const hayCascada = (plan?.imputar || []).some((i) => i.porCascada);

  const ambiguos = (plan?.dejar || []).filter((d) => d.motivo === "ambiguo");
  const sinMonto = (plan?.dejar || []).filter((d) => d.motivo === "sin_monto");
  const sinMatch = (plan?.dejar || []).filter((d) => d.motivo === "sin_coincidencia");

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(5px)", display: "flex", alignItems: "flex-start",
        justifyContent: "center", zIndex: 60, padding: "24px 16px", overflowY: "auto",
      }}
    >
      <div style={{
        background: "var(--surface-solid)", border: "1px solid var(--border-default)",
        borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "calc(100vh - 48px)",
        margin: "auto", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-elevated)",
      }}>
        {/* Header */}
        <div style={{
          padding: "17px 20px", borderBottom: "1px solid var(--border-default)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            {listo ? "Listo" : "Imputar costos automáticamente"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: "auto", flex: 1, minHeight: 0 }}>
          {cargando && (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-tertiary)", fontSize: 13 }}>
              Revisando los costos…
            </div>
          )}

          {error && (
            <div style={{
              background: "var(--danger-soft)", border: "1px solid var(--danger-border)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
              fontSize: 12.5, color: "var(--danger)",
            }}>
              {error}
            </div>
          )}

          {plan?.sinPresupuestos && (
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Todavía no hay presupuestos cargados, así que no hay dónde imputar los costos.
              Cargalos primero en la solapa <strong style={{ color: "var(--text-primary)" }}>Presupuestos</strong> y
              volvé acá.
            </div>
          )}

          {plan && !plan.sinPresupuestos && (
            <>
              {listo && (
                <div style={{
                  background: "var(--success-soft)", border: "1px solid var(--success-border)",
                  borderRadius: 10, padding: "11px 14px", marginBottom: 16,
                  fontSize: 12.5, color: "var(--success)",
                }}>
                  ✓ {plan.imputar.length} {plan.imputar.length === 1 ? "costo imputado" : "costos imputados"}.
                  Ya se ven reflejados en Presupuestado vs Real.
                </div>
              )}

              {porPartida.size === 0 && !listo && (
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
                  No encontré ningún costo que pueda imputar sin dudar. Los presupuestos se
                  reconocen por el nombre del proveedor dentro del concepto del costo.
                </div>
              )}

              {porPartida.size > 0 && (
                <>
                  {!listo && (
                    <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
                      Voy a imputar <strong style={{ color: "var(--text-primary)" }}>{plan.imputar.length}</strong>{" "}
                      {plan.imputar.length === 1 ? "costo" : "costos"}. Revisá antes de confirmar:
                    </div>
                  )}
                  {hayCascada && (
                    <div style={{
                      fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.5,
                      background: "var(--surface-1)", border: "1px dashed var(--border-default)",
                      borderRadius: 9, padding: "9px 12px", marginBottom: 12,
                    }}>
                      Hay un proveedor con más de un presupuesto: los pagos se cargan por fecha
                      al primero hasta completarlo y de ahí siguen en el siguiente.
                    </div>
                  )}

                  {Array.from(porPartida.entries()).map(([id, g]) => {
                    const r = resumenPorId.get(id);
                    const totalTrasImputar = r ? r.previoArs + r.nuevoArs : 0;
                    const pct = r && r.presupuestoArs > 0
                      ? Math.round((totalTrasImputar / r.presupuestoArs) * 100)
                      : null;
                    const excedido = pct !== null && pct > 100;

                    return (
                      <div key={id} style={{
                        background: "var(--surface-1)", border: "1px solid var(--border-faint)",
                        borderRadius: 10, padding: "11px 13px", marginBottom: 9,
                      }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>
                          {g.nombre}
                          <span style={{ color: "var(--text-tertiary)", fontWeight: 500, marginLeft: 6 }}>
                            · {g.items.length} {g.items.length === 1 ? "costo" : "costos"}
                          </span>
                        </div>

                        {r && r.presupuestoArs > 0 && (
                          <div style={{ fontSize: 11.5, marginBottom: 7, color: "var(--text-secondary)" }}>
                            {fmtArs(r.nuevoArs)} sobre un presupuesto de {fmtArs(r.presupuestoArs)}
                            {" — queda al "}
                            <strong style={{ color: excedido ? "var(--danger)" : pct !== null && pct >= 90 ? "var(--warning)" : "var(--success)" }}>
                              {pct}%
                            </strong>
                          </div>
                        )}

                        <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                          {g.items.slice(0, 6).map((it, i) => (
                            <div key={i} style={{ display: "flex", gap: 8 }}>
                              <span style={{ flex: 1, minWidth: 0 }}>· {it.concept}</span>
                              <span className="tabular" style={{ whiteSpace: "nowrap" }}>
                                {fmtArs(it.montoArs)}
                                {it.excede && <span style={{ color: "var(--warning)" }}> ▸ completa</span>}
                              </span>
                            </div>
                          ))}
                          {g.items.length > 6 && <div>· y {g.items.length - 6} más</div>}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {(ambiguos.length > 0 || sinMonto.length > 0 || sinMatch.length > 0) && (
                <div style={{
                  marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-faint)",
                  fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.6,
                }}>
                  {ambiguos.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "var(--warning)" }}>{ambiguos.length} sin tocar por ambigüedad</strong>
                      {" "}— le calzaba más de un presupuesto:
                      {ambiguos.slice(0, 4).map((a, i) => (
                        <div key={i}>· {a.concept} → {(a.candidatos || []).join(" / ")}</div>
                      ))}
                      {ambiguos.length > 4 && <div>· y {ambiguos.length - 4} más</div>}
                    </div>
                  )}
                  {sinMonto.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "var(--warning)" }}>{sinMonto.length} sin tocar por falta de monto</strong>
                      {" "}— el proveedor tiene varios presupuestos pero ninguno tiene el monto
                      cargado, así que no puedo saber cuándo se completa el primero.
                    </div>
                  )}
                  {sinMatch.length > 0 && (
                    <div>
                      <strong>{sinMatch.length} quedan sin presupuesto</strong> — no reconocí a
                      qué proveedor corresponden. Los podés asignar a mano editando cada costo.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "15px 20px", borderTop: "1px solid var(--border-default)",
          display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border-default)",
              background: "transparent", color: "var(--text-secondary)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {listo ? "Cerrar" : "Cancelar"}
          </button>
          {!listo && plan && !plan.sinPresupuestos && plan.imputar.length > 0 && (
            <button
              onClick={aplicar}
              disabled={aplicando}
              style={{
                padding: "8px 14px", borderRadius: 8, border: "none",
                background: "var(--accent)", color: "var(--accent-on)",
                fontSize: 13, fontWeight: 600,
                cursor: aplicando ? "wait" : "pointer", opacity: aplicando ? 0.6 : 1,
              }}
            >
              {aplicando ? "Imputando…" : `Imputar ${plan.imputar.length}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
