"use client";

/**
 * Pantalla 2a — Detalle de obra (unificada). Ver SISTEMA.md.
 *
 * Estructura de arriba a abajo:
 *  1. Frase de estado (castellano llano, fija la base de cálculo)
 *  2. Héroe 2 col: margen proyectado + cascada · avance por etapas + alerta
 *  3. Escenarios de venta (4 precios, el objetivo marcado)
 *  4. Lecciones del proyecto (siempre visibles)
 *  5. ── DETALLE OPERATIVO ── (plegable con "Vista socios")
 *
 * Una sola cifra manda: el margen proyectado, SIEMPRE sobre cierreEstimado
 * y expresado sobre la venta objetivo.
 */

import { useMemo, useState } from "react";
import { Cost, Expense, Partida, EtapasAvance } from "@/types";
import {
  computeObraProyeccion,
  computeRitmoObra,
  semaforoMargen,
  ETAPAS_PESOS,
  ETAPAS_LABELS,
  EtapaKey,
} from "@/lib/financial";
import { fmtUsd, fmtUsdSign, fmtPctAr, fmtNum, safeNum } from "@/lib/format";
import { projectsApi } from "@/lib/api-client";

interface ObraDetalleProps {
  projectId: string;
  projectName: string;
  status: string;
  buyPrice: number;
  totalCosts: number;
  totalExpenses: number;
  listingPrice: number | null; // venta objetivo
  salePrice: number | null;
  costToFinish: number | null | undefined; // estimado para terminar la obra
  etapas: EtapasAvance | null | undefined;
  costs: Cost[];
  expenses: Expense[];
  partidas: Partida[];
  canEdit: boolean;
  onRefetch: () => void;
  onVerCostos: () => void;
  onVerPresupuestos: () => void;
}

const SEMAFORO_VAR: Record<string, string> = {
  verde: "var(--success)",
  ambar: "var(--warning)",
  rojo: "var(--danger)",
};

const ETAPA_KEYS = Object.keys(ETAPAS_PESOS) as EtapaKey[];

export default function ObraDetalle(props: ObraDetalleProps) {
  const {
    projectId, status, buyPrice, totalCosts, totalExpenses,
    listingPrice, salePrice, costToFinish, etapas, costs, expenses, partidas,
    canEdit, onRefetch, onVerCostos, onVerPresupuestos,
  } = props;

  const vendida = status === "vendido" && safeNum(salePrice) > 0;
  const ventaReferencia = vendida ? safeNum(salePrice) : safeNum(listingPrice);

  // ── Vista socios: pliega el detalle operativo. Misma URL, misma página. ──
  const [vistaSocios, setVistaSocios] = useState(false);

  // ── Editor de venta objetivo ──
  const [editandoVenta, setEditandoVenta] = useState(false);
  const [ventaDraft, setVentaDraft] = useState("");
  const [guardandoVenta, setGuardandoVenta] = useState(false);

  // ── Editor de "falta para terminar" ──
  const [editandoFalta, setEditandoFalta] = useState(false);
  const [faltaDraft, setFaltaDraft] = useState("");
  const [guardandoFalta, setGuardandoFalta] = useState(false);

  // ── Editor de etapas ──
  const [editandoEtapas, setEditandoEtapas] = useState(false);
  const [etapasDraft, setEtapasDraft] = useState<Record<EtapaKey, string>>(
    () => Object.fromEntries(
      ETAPA_KEYS.map((k) => [k, String(safeNum(etapas?.[k]))])
    ) as Record<EtapaKey, string>
  );
  const [guardandoEtapas, setGuardandoEtapas] = useState(false);

  // ── Base de cálculo (no negociable) ──
  const proy = useMemo(
    () => computeObraProyeccion({
      buyPrice, totalCosts, totalExpenses, ventaReferencia,
      faltaParaTerminar: costToFinish,
      partidas: partidas || [], costs: costs || [],
    }),
    [buyPrice, totalCosts, totalExpenses, ventaReferencia, costToFinish, partidas, costs]
  );

  // Ritmo de obra: solo costos + avance, sin mirar el presupuesto por rubro.
  const ritmo = useMemo(
    () => computeRitmoObra({
      costosObra: totalCosts, buyPrice, totalExpenses, ventaReferencia, etapas,
    }),
    [totalCosts, buyPrice, totalExpenses, ventaReferencia, etapas]
  );

  const tienePresupuesto = (partidas || []).length > 0 && proy.presupuestoTotal > 0;
  // El presupuesto por rubro solo sirve si cubre al menos la mitad de lo gastado.
  const presupuestoConfiable = tienePresupuesto && proy.presupuestoTotal >= totalCosts * 0.5;
  const tieneFalta = proy.faltaEsManual;
  const tieneEtapas = ETAPA_KEYS.some((k) => safeNum(etapas?.[k]) > 0);
  const tieneVenta = ventaReferencia > 0;
  const margenColor = tieneVenta ? SEMAFORO_VAR[proy.semaforo] : "var(--text-tertiary)";

  // ── Guardar venta objetivo ──
  const guardarVenta = async () => {
    const v = Number(ventaDraft.replace(/\./g, "").replace(",", "."));
    if (!isFinite(v) || v <= 0) return;
    try {
      setGuardandoVenta(true);
      await projectsApi.update(projectId, { listingPrice: v });
      setEditandoVenta(false);
      onRefetch();
    } catch (err) {
      window.alert("No se pudo guardar la venta objetivo. " + (err instanceof Error ? err.message : ""));
    } finally {
      setGuardandoVenta(false);
    }
  };

  // ── Guardar "falta para terminar" ──
  const guardarFalta = async () => {
    const v = Number(faltaDraft.replace(/\./g, "").replace(",", "."));
    if (!isFinite(v) || v < 0) return;
    try {
      setGuardandoFalta(true);
      await projectsApi.update(projectId, { costToFinish: v });
      setEditandoFalta(false);
      onRefetch();
    } catch (err) {
      window.alert("No se pudo guardar el estimado. " + (err instanceof Error ? err.message : ""));
    } finally {
      setGuardandoFalta(false);
    }
  };

  // ── Guardar etapas ──
  const guardarEtapas = async () => {
    const payload: EtapasAvance = {};
    ETAPA_KEYS.forEach((k) => {
      const v = Number(etapasDraft[k]);
      payload[k] = isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
    });
    try {
      setGuardandoEtapas(true);
      await projectsApi.update(projectId, { etapas: payload });
      setEditandoEtapas(false);
      onRefetch();
    } catch (err) {
      window.alert("No se pudo guardar el avance. " + (err instanceof Error ? err.message : ""));
    } finally {
      setGuardandoEtapas(false);
    }
  };

  // ── Escenarios de venta: 4 precios alrededor del objetivo ──
  const escenarios = useMemo(() => {
    if (!tieneVenta || vendida) return [];
    const base = ventaReferencia;
    const round5k = (n: number) => Math.round(n / 5000) * 5000;
    const precios = Array.from(new Set([
      round5k(base * 0.95), base, round5k(base * 1.05), round5k(base * 1.1),
    ])).sort((a, b) => a - b);
    return precios.map((precio) => {
      const ganancia = precio - proy.cierreEstimado;
      const margen = precio > 0 ? (ganancia / precio) * 100 : 0;
      return { precio, ganancia, margen, esObjetivo: precio === base };
    });
  }, [tieneVenta, vendida, ventaReferencia, proy.cierreEstimado]);

  // ── Lecciones del proyecto (derivadas de los datos, siempre visibles) ──
  const lecciones = useMemo(() => {
    const out: { titulo: string; texto: string; tono: "ok" | "warn" | "info" }[] = [];

    // 1. Rubro más desviado
    if (presupuestoConfiable) {
      const rubros = (partidas || []).map((p) => {
        const projected = safeNum(p.estimatedAmount) || 0;
        const cots = p.cotizaciones || [];
        const chosen = cots.find((c) => c.isChosen);
        const proj = chosen
          ? (chosen.currency === "ARS" && chosen.amountUsd != null ? safeNum(chosen.amountUsd) : safeNum(chosen.amount))
          : cots.length > 0
            ? Math.min(...cots.map((c) => (c.currency === "ARS" && c.amountUsd != null ? safeNum(c.amountUsd) : safeNum(c.amount))))
            : projected;
        const executed = (costs || [])
          .filter((c) => c.partidaId === p.id)
          .reduce((s, c) => s + (c.currency === "ARS" && c.amountUsd != null ? safeNum(c.amountUsd) : safeNum(c.amount)), 0);
        return { name: p.name, proj, executed, exceso: executed - proj };
      });
      const peor = rubros.filter((r) => r.proj > 0).sort((a, b) => b.exceso - a.exceso)[0];
      if (peor && peor.exceso > 0) {
        out.push({
          titulo: `${peor.name} se pasó`,
          texto: `Lleva ${fmtUsd(peor.executed)} contra ${fmtUsd(peor.proj)} presupuestados: ${fmtUsd(peor.exceso)} de más (${fmtPctAr((peor.exceso / peor.proj) * 100, 0)}). Eso es margen que ya no está.`,
          tono: "warn",
        });
      } else {
        out.push({
          titulo: "Presupuesto bajo control",
          texto: `Ningún rubro se pasó de lo presupuestado. Cada peso dentro de presupuesto no mueve el margen: ya estaba contado en el cierre estimado.`,
          tono: "ok",
        });
      }
    } else if (!tieneFalta) {
      out.push({
        titulo: "Falta estimar cuánto queda",
        texto: "Sin el estimado de lo que falta pagar no hay cierre ni margen confiable: el número se calcularía solo con lo ya gastado. Escribilo arriba, en “Falta para terminar”.",
        tono: "warn",
      });
    }

    // 2. Ritmo de obra (solo costos y avance)
    if (ritmo.hayDatos) {
      if (ritmo.alerta) {
        out.push({
          titulo: "El ritmo de gasto se come el margen",
          texto: `Llevás ${fmtUsd(ritmo.costosObra)} con la obra al ${fmtPctAr(ritmo.avancePct, 0)}. Si sigue a este ritmo, la obra completa cuesta ${fmtUsd(ritmo.obraAlRitmo)} y el margen cae a ${fmtPctAr(ritmo.margenAlRitmo)}.`,
          tono: "warn",
        });
      } else {
        out.push({
          titulo: "El ritmo de gasto cierra bien",
          texto: `Con la obra al ${fmtPctAr(ritmo.avancePct, 0)} y ${fmtUsd(ritmo.costosObra)} gastados, seguir a este ritmo deja la obra en ${fmtUsd(ritmo.obraAlRitmo)}${ritmo.margenAlRitmo != null ? ` y el margen en ${fmtPctAr(ritmo.margenAlRitmo)}` : ""}.`,
          tono: "ok",
        });
      }
    } else {
      out.push({
        titulo: "Cargá el avance mensual",
        texto: "Actualizar las 5 etapas una vez por mes permite proyectar el costo total de la obra desde el ritmo real de gasto, sin depender del presupuesto.",
        tono: "info",
      });
    }

    // 3. Peso de los gastos fijos
    const meses = new Set((expenses || []).map((e) => {
      const d = new Date(e.period);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })).size;
    const promMes = meses > 0 ? totalExpenses / meses : 0;
    out.push({
      titulo: "Los gastos fijos también comen margen",
      texto: totalExpenses > 0
        ? `Expensas, impuestos y servicios suman ${fmtUsd(totalExpenses)} (${fmtUsd(promMes)}/mes). Cada mes extra de obra corre el cierre ${fmtUsd(promMes)} más lejos.`
        : "Todavía no hay gastos mensuales cargados. Expensas, impuestos y servicios se comen margen mes a mes: conviene registrarlos.",
      tono: totalExpenses > 0 ? "info" : "ok",
    });

    // 4. Mix de moneda
    const costosArs = (costs || []).filter((c) => c.currency === "ARS");
    const pctArs = (costs || []).length > 0 ? (costosArs.length / costs.length) * 100 : 0;
    out.push({
      titulo: "El TC queda escrito",
      texto: costosArs.length > 0
        ? `El ${fmtPctAr(pctArs, 0)} de los costos se pagó en ARS. Cada registro guarda el TC del día del gasto: el histórico no se recalcula.`
        : "Todos los costos se cargaron en USD directo. Cuando cargues en ARS, el TC del día queda guardado con el registro.",
      tono: "info",
    });

    return out.slice(0, 4);
  }, [presupuestoConfiable, tieneFalta, partidas, costs, expenses, totalExpenses, ritmo]);

  // ── Cascada de margen: 7 columnas flotantes ──
  const cascada = useMemo(() => {
    const compra = safeNum(buyPrice);
    const cols = [
      { label: "Compra", start: 0, value: compra, tipo: "seg" as const },
      { label: "Costos obra", start: compra, value: totalCosts, tipo: "seg" as const },
      { label: "Gastos", start: compra + totalCosts, value: totalExpenses, tipo: "seg" as const },
      { label: "Falta terminar", start: proy.inversionActual, value: proy.presupuestoRestante, tipo: "resto" as const },
      { label: "Cierre est.", start: 0, value: proy.cierreEstimado, tipo: "total" as const },
      { label: vendida ? "Venta" : "Venta objetivo", start: 0, value: ventaReferencia, tipo: "venta" as const },
      { label: "Ganancia", start: Math.min(proy.cierreEstimado, ventaReferencia), value: Math.abs(proy.ganancia), tipo: proy.ganancia >= 0 ? ("gan" as const) : ("perdida" as const) },
    ];
    const max = Math.max(...cols.map((c) => c.start + c.value), 1);
    return { cols, max };
  }, [buyPrice, totalCosts, totalExpenses, proy, ventaReferencia, vendida]);

  // ── Presupuesto vs real por rubro (detalle operativo) ──
  const rubros = useMemo(() => {
    return (partidas || []).map((p) => {
      const cots = p.cotizaciones || [];
      const chosen = cots.find((c) => c.isChosen);
      const projected = chosen
        ? (chosen.currency === "ARS" && chosen.amountUsd != null ? safeNum(chosen.amountUsd) : safeNum(chosen.amount))
        : cots.length > 0
          ? Math.min(...cots.map((c) => (c.currency === "ARS" && c.amountUsd != null ? safeNum(c.amountUsd) : safeNum(c.amount))))
          : safeNum(p.estimatedAmount);
      const executed = (costs || [])
        .filter((c) => c.partidaId === p.id)
        .reduce((s, c) => s + (c.currency === "ARS" && c.amountUsd != null ? safeNum(c.amountUsd) : safeNum(c.amount)), 0);
      const pct = projected > 0 ? (executed / projected) * 100 : 0;
      return { id: p.id, name: p.name, projected, executed, pct };
    }).sort((a, b) => b.pct - a.pct);
  }, [partidas, costs]);

  const costosRecientes = useMemo(
    () => [...(costs || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
    [costs]
  );

  const avancePonderado = ritmo.avancePct;

  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="obra2a">

      {/* ── 1. FRASE DE ESTADO ─────────────────────────────────────────── */}
      <p className="obra2a-frase">
        {vendida ? (
          <>
            La vendimos en <b className="mono">{fmtUsd(ventaReferencia)}</b>. Entre compra, obra y
            gastos pusimos <b className="mono">{fmtUsd(proy.inversionActual)}</b>: quedaron{" "}
            <b className="mono" style={{ color: margenColor }}>{fmtUsd(proy.ganancia)}</b> de ganancia
            — un margen realizado del{" "}
            <b className="mono" style={{ color: margenColor }}>{fmtPctAr(proy.margenProyectado)}</b>.
          </>
        ) : (
          <>
            Pusimos <b className="mono">{fmtUsd(proy.inversionActual)}</b> entre compra, obra y gastos.
            {tieneFalta ? (
              <> Calculás <b className="mono">{fmtUsd(proy.presupuestoRestante)}</b> más para terminarla:
              la obra cerraría en <b className="mono">{fmtUsd(proy.cierreEstimado)}</b>.</>
            ) : (
              <> Falta definir cuánto más hace falta para terminarla.</>
            )}
            {tieneVenta ? (
              <> Si la vendemos en <b className="mono">{fmtUsd(ventaReferencia)}</b>, quedan{" "}
              <b className="mono" style={{ color: margenColor }}>{fmtUsd(proy.ganancia)}</b> de ganancia
              — un margen del <b className="mono" style={{ color: margenColor }}>{fmtPctAr(proy.margenProyectado)}</b>.</>
            ) : (
              <> Todavía no definimos a cuánto queremos venderla: cargá la venta objetivo para ver el margen.</>
            )}
          </>
        )}
      </p>

      {/* ── 2. HÉROE ───────────────────────────────────────────────────── */}
      <div className="obra2a-hero">

        {/* Margen proyectado + cascada */}
        <div className="obra2a-card">
          <div className="obra2a-kicker">{vendida ? "MARGEN REALIZADO" : "MARGEN PROYECTADO"}</div>

          <div className="obra2a-heroRow">
            <div>
              <div className="obra2a-heroCifra mono" style={{ color: margenColor }}>
                {tieneVenta ? fmtPctAr(proy.margenProyectado) : "—"}
              </div>
              <div className="obra2a-heroSub">
                {tieneVenta ? (
                  <>{fmtUsdSign(proy.ganancia)} sobre {vendida ? "la venta" : "la venta objetivo"} · cierre estimado <span className="mono">{fmtUsd(proy.cierreEstimado)}</span></>
                ) : (
                  <>Sin venta objetivo no hay margen que mirar.</>
                )}
              </div>
            </div>

            {/* Venta objetivo + falta para terminar — editables (Tweaks) */}
            {!vendida && (
              <div className="obra2a-ventaBox">
                <div className="obra2a-kicker" style={{ marginBottom: 4 }}>FALTA PARA TERMINAR</div>
                {editandoFalta ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>USD</span>
                    <input
                      className="obra2a-ventaInput mono"
                      inputMode="numeric"
                      autoFocus
                      value={faltaDraft}
                      onChange={(e) => setFaltaDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") guardarFalta(); if (e.key === "Escape") setEditandoFalta(false); }}
                      placeholder={ritmo.faltaSegunRitmo != null ? fmtNum(ritmo.faltaSegunRitmo) : "20.000"}
                    />
                    <button className="obra2a-btnGuardar" onClick={guardarFalta} disabled={guardandoFalta}>
                      {guardandoFalta ? "…" : "Guardar"}
                    </button>
                  </div>
                ) : (
                  <button
                    className="obra2a-ventaValor mono"
                    disabled={!canEdit}
                    onClick={() => { setFaltaDraft(tieneFalta ? String(Math.round(proy.presupuestoRestante)) : ""); setEditandoFalta(true); }}
                    title={canEdit ? "Cuánto calculás que falta pagar para terminar la obra" : undefined}
                  >
                    {tieneFalta ? fmtUsd(proy.presupuestoRestante) : "+ Estimar"}
                    {canEdit && <span className="obra2a-lapiz">✎</span>}
                  </button>
                )}
                {!editandoFalta && ritmo.hayDatos && ritmo.faltaSegunRitmo != null && (
                  <div className="obra2a-ventaHint mono">
                    al ritmo actual: {fmtUsd(ritmo.faltaSegunRitmo)}
                  </div>
                )}

                <div className="obra2a-kicker" style={{ marginBottom: 4, marginTop: 14 }}>VENTA OBJETIVO</div>
                {editandoVenta ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>USD</span>
                    <input
                      className="obra2a-ventaInput mono"
                      inputMode="numeric"
                      autoFocus
                      value={ventaDraft}
                      onChange={(e) => setVentaDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") guardarVenta(); if (e.key === "Escape") setEditandoVenta(false); }}
                      placeholder={tieneVenta ? fmtNum(ventaReferencia) : "340.000"}
                    />
                    <button className="obra2a-btnGuardar" onClick={guardarVenta} disabled={guardandoVenta}>
                      {guardandoVenta ? "…" : "Guardar"}
                    </button>
                  </div>
                ) : (
                  <button
                    className="obra2a-ventaValor mono"
                    disabled={!canEdit}
                    onClick={() => { setVentaDraft(tieneVenta ? String(Math.round(ventaReferencia)) : ""); setEditandoVenta(true); }}
                    title={canEdit ? "Cambiar la venta objetivo" : undefined}
                  >
                    {tieneVenta ? fmtUsd(ventaReferencia) : "+ Definir"}
                    {canEdit && <span className="obra2a-lapiz">✎</span>}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Cascada de margen — 7 columnas flotantes */}
          <div className="obra2a-cascada">
            {cascada.cols.map((c) => {
              const H = 150;
              const h = Math.max(3, (c.value / cascada.max) * H);
              const mb = (c.start / cascada.max) * H;
              const bg =
                c.tipo === "gan" ? "var(--success)"
                : c.tipo === "perdida" ? "var(--danger)"
                : c.tipo === "venta" ? "var(--surface-3)"
                : c.tipo === "total" ? "var(--shade-6)"
                : c.tipo === "resto" ? "var(--shade-7)"
                : "var(--shade-6)";
              const border = c.tipo === "venta" ? "1px dashed var(--border-strong)" : "none";
              return (
                <div key={c.label} className="obra2a-cascadaCol">
                  <div className="obra2a-cascadaTrack" style={{ height: H }}>
                    <div className="mono obra2a-cascadaVal">{fmtNum(c.value)}</div>
                    <div style={{ height: h, marginBottom: mb, background: bg, border, borderRadius: 3, width: "100%" }} />
                  </div>
                  <div className="obra2a-cascadaLabel">{c.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Avance por etapas + alerta gasto vs avance */}
        <div className="obra2a-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="obra2a-kicker">AVANCE DE OBRA</div>
              <div className="obra2a-avanceCifra mono">{fmtPctAr(avancePonderado, 0)}</div>
            </div>
            {canEdit && !editandoEtapas && (
              <button
                className="obra2a-btnMini"
                onClick={() => {
                  setEtapasDraft(Object.fromEntries(ETAPA_KEYS.map((k) => [k, String(safeNum(etapas?.[k]))])) as Record<EtapaKey, string>);
                  setEditandoEtapas(true);
                }}
              >
                Actualizar
              </button>
            )}
            {editandoEtapas && (
              <div style={{ display: "flex", gap: 6 }}>
                <button className="obra2a-btnMini" onClick={() => setEditandoEtapas(false)}>Cancelar</button>
                <button className="obra2a-btnGuardar" onClick={guardarEtapas} disabled={guardandoEtapas}>
                  {guardandoEtapas ? "…" : "Guardar"}
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            {ETAPA_KEYS.map((k) => {
              const pct = Math.min(100, Math.max(0, safeNum(etapas?.[k])));
              return (
                <div key={k} className="obra2a-etapaRow">
                  <span className="obra2a-etapaNombre">{ETAPAS_LABELS[k]}</span>
                  <span className="obra2a-etapaPeso mono">{ETAPAS_PESOS[k]}%</span>
                  <div className="obra2a-etapaBarra">
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--info)", borderRadius: 3, transition: "width .25s" }} />
                  </div>
                  {editandoEtapas ? (
                    <input
                      className="obra2a-etapaInput mono"
                      inputMode="numeric"
                      value={etapasDraft[k]}
                      onChange={(e) => setEtapasDraft((d) => ({ ...d, [k]: e.target.value }))}
                    />
                  ) : (
                    <span className="obra2a-etapaPct mono">{fmtPctAr(pct, 0)}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ritmo de obra: solo costos y avance, nada de presupuesto */}
          {ritmo.hayDatos ? (
            <div className={`obra2a-estado ${ritmo.alerta ? "warn" : ritmo.margenAlRitmo != null ? "ok" : "info"}`}>
              Llevás <b className="mono">{fmtUsd(ritmo.costosObra)}</b> en obra con el avance
              al <b className="mono">{fmtPctAr(ritmo.avancePct, 0)}</b>. A este ritmo la obra completa
              costaría <b className="mono">{fmtUsd(ritmo.obraAlRitmo)}</b> —{" "}
              <b className="mono">{fmtUsd(ritmo.faltaSegunRitmo)}</b> más que lo ya pagado
              {ritmo.margenAlRitmo != null && (
                <> — y el margen quedaría en{" "}
                <b className="mono" style={{ color: SEMAFORO_VAR[ritmo.semaforo || "rojo"] }}>
                  {fmtPctAr(ritmo.margenAlRitmo)}
                </b></>
              )}.
              {tieneFalta && ritmo.faltaSegunRitmo != null && ritmo.faltaSegunRitmo > proy.presupuestoRestante * 1.2 && (
                <> Tu estimado de <b className="mono">{fmtUsd(proy.presupuestoRestante)}</b> puede quedar corto.</>
              )}
            </div>
          ) : (
            <div className="obra2a-estado info">
              {!tieneEtapas
                ? <>Actualizá el avance de las 5 etapas (una vez por mes alcanza) para ver cuánto costaría la obra completa a este ritmo.</>
                : <>Cargá costos de obra para proyectar el cierre a partir del ritmo real de gasto.</>}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. ESCENARIOS DE VENTA ─────────────────────────────────────── */}
      {escenarios.length > 0 && (
        <div className="obra2a-card" style={{ marginTop: 18 }}>
          <div className="obra2a-kicker">SI LA VENDEMOS EN…</div>
          <div className="obra2a-escenarios">
            {escenarios.map((e) => {
              const sem = SEMAFORO_VAR[semaforoMargen(e.margen)];
              return (
                <div key={e.precio} className={`obra2a-escenario ${e.esObjetivo ? "objetivo" : ""}`}>
                  {e.esObjetivo && <div className="obra2a-chipObjetivo mono">OBJETIVO ACTUAL</div>}
                  <div className="obra2a-escenarioPrecio mono">{fmtUsd(e.precio)}</div>
                  <div className="obra2a-escenarioGan mono" style={{ color: sem }}>{fmtUsdSign(e.ganancia)}</div>
                  <div className="obra2a-escenarioMargen">
                    margen <b className="mono" style={{ color: sem }}>{fmtPctAr(e.margen)}</b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. LECCIONES DEL PROYECTO ──────────────────────────────────── */}
      <div style={{ marginTop: 18 }}>
        <div className="obra2a-kicker" style={{ marginBottom: 10 }}>LECCIONES DEL PROYECTO</div>
        <div className="obra2a-lecciones">
          {lecciones.map((l) => (
            <div key={l.titulo} className={`obra2a-leccion ${l.tono}`}>
              <div className="obra2a-leccionTitulo">{l.titulo}</div>
              <div className="obra2a-leccionTexto">{l.texto}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. DETALLE OPERATIVO (plegable con Vista socios) ───────────── */}
      <div className="obra2a-separador">
        <div className="obra2a-separadorLinea" />
        <span className="obra2a-separadorLabel mono">DETALLE OPERATIVO</span>
        <div className="obra2a-separadorLinea" />
        <label className="obra2a-switchWrap" title="Lo que ve el socio es un subconjunto de esta misma página">
          <span className="obra2a-switchLabel">Vista socios</span>
          <button
            role="switch"
            aria-checked={vistaSocios}
            className={`obra2a-switch ${vistaSocios ? "on" : ""}`}
            onClick={() => setVistaSocios((v) => !v)}
          >
            <span className="obra2a-switchDot" />
          </button>
        </label>
      </div>

      {vistaSocios ? (
        <div className="obra2a-socioNota">
          Esto es lo que ve un socio: el resumen de arriba, sin el detalle operativo.
          Misma página, mismo número — nunca un documento aparte que quede viejo.
        </div>
      ) : (
        <div>
          {/* Presupuesto vs real por rubro — solo si el presupuesto cubre la obra */}
          <div className="obra2a-card" style={{ marginTop: 14 }}>
            <div className="obra2a-kicker">PRESUPUESTO VS. REAL POR RUBRO</div>
            {!presupuestoConfiable ? (
              <div className="obra2a-vacio">
                {rubros.length === 0 ? (
                  <>Sin presupuesto por rubro todavía. </>
                ) : (
                  <>El presupuesto cargado ({fmtUsd(proy.presupuestoTotal)}) cubre solo una parte
                  de los {fmtUsd(totalCosts)} ya gastados, así que compararlo daría porcentajes
                  engañosos. Se muestra cuando esté completo. </>
                )}
                <button className="obra2a-link" onClick={onVerPresupuestos}>
                  {rubros.length === 0 ? "Cargarlo en Presupuestos →" : "Completarlo en Presupuestos →"}
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                {rubros.map((r) => {
                  const max = Math.max(r.projected, r.executed, 1);
                  const wReal = (r.executed / max) * 100;
                  const xMeta = (r.projected / max) * 100;
                  const excedido = r.projected > 0 && r.executed > r.projected;
                  const alerta90 = r.projected > 0 && r.pct >= 90 && !excedido;
                  return (
                    <div key={r.id} className="obra2a-rubroRow">
                      <span className="obra2a-rubroNombre">{r.name}</span>
                      <div className="obra2a-rubroBarra">
                        <div style={{
                          width: `${wReal}%`, height: "100%", borderRadius: 3,
                          background: excedido ? "var(--warning)" : "var(--shade-6)",
                          transition: "width .25s",
                        }} />
                        {r.projected > 0 && (
                          <div className="obra2a-rubroMeta" style={{ left: `${xMeta}%` }} />
                        )}
                      </div>
                      <span className="obra2a-rubroReal mono" style={{ color: excedido ? "var(--warning)" : alerta90 ? "var(--warning)" : "var(--text-primary)" }}>
                        {fmtNum(r.executed)}
                      </span>
                      <span className="obra2a-rubroProy mono">/ {r.projected > 0 ? fmtNum(r.projected) : "s/p"}</span>
                      <span className="obra2a-rubroPct mono" style={{ color: excedido ? "var(--warning)" : "var(--text-tertiary)" }}>
                        {r.projected > 0 ? fmtPctAr(r.pct, 0) : "—"}
                      </span>
                    </div>
                  );
                })}
                <div className="obra2a-rubroTotales mono">
                  Ejecutado {fmtUsd(proy.ejecutadoEnPresupuesto)} de {fmtUsd(proy.presupuestoTotal)} presupuestados
                </div>
              </div>
            )}
          </div>

          {/* Ritmo de gasto — costos vs. estimación, sin presupuesto por rubro */}
          {ritmo.hayDatos && (
            <div className="obra2a-card" style={{ marginTop: 14 }}>
              <div className="obra2a-kicker">RITMO DE GASTO</div>
              <div className="obra2a-ritmo">
                <div>
                  <div className="obra2a-ritmoLabel">Gastado en obra ({fmtPctAr(ritmo.avancePct, 0)} construido)</div>
                  <div className="obra2a-ritmoVal mono">{fmtUsd(ritmo.costosObra)}</div>
                </div>
                <div>
                  <div className="obra2a-ritmoLabel">Falta, según tu estimado</div>
                  <div className="obra2a-ritmoVal mono">
                    {tieneFalta ? fmtUsd(proy.presupuestoRestante) : "—"}
                  </div>
                </div>
                <div>
                  <div className="obra2a-ritmoLabel">Falta, al ritmo actual</div>
                  <div
                    className="obra2a-ritmoVal mono"
                    style={{
                      color: tieneFalta && ritmo.faltaSegunRitmo != null && ritmo.faltaSegunRitmo > proy.presupuestoRestante * 1.2
                        ? "var(--warning)" : "var(--text-primary)",
                    }}
                  >
                    {fmtUsd(ritmo.faltaSegunRitmo)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Últimos costos */}
          <div className="obra2a-card" style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="obra2a-kicker">ÚLTIMOS COSTOS</div>
              <button className="obra2a-link" onClick={onVerCostos}>Ver todos →</button>
            </div>
            {costosRecientes.length === 0 ? (
              <div className="obra2a-vacio">Sin costos cargados todavía.</div>
            ) : (
              <table className="obra2a-tabla">
                <tbody>
                  {costosRecientes.map((c) => {
                    const usd = c.currency === "ARS" && c.amountUsd != null ? safeNum(c.amountUsd) : safeNum(c.amount);
                    return (
                      <tr key={c.id}>
                        <td className="mono obra2a-tdFecha">
                          {new Date(c.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                        </td>
                        <td className="obra2a-tdConcepto">{c.concept}</td>
                        <td className="obra2a-tdCat">{c.category}</td>
                        <td className="mono obra2a-tdMonto">
                          {fmtUsd(usd)}
                          {c.currency === "ARS" && (
                            <span className="obra2a-tdArs mono"> ARS {fmtNum(c.amount)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
