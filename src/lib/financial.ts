/**
 * Centralized financial calculations for the Negocios app.
 *
 * Single source of truth for all project financial computations.
 * Used by API routes to compute derived fields before sending to the client.
 */

/** Safely convert a nullable/undefined number to a finite number, defaulting to 0 */
export const safe = (n: number | null | undefined): number => {
  if (n == null || isNaN(n) || !isFinite(n)) return 0;
  return n;
};

export interface ProjectFinancials {
  totalCosts: number;
  totalExpenses: number;
  investment: number;
  result: number;
  margin: number;
  estimatedMargin: number;
}

/**
 * Compute all derived financial fields for a project.
 *
 * @param project - Must have buyPrice, salePrice, listingPrice fields
 * @param costs - Array of cost records (supports multi-currency via amountUsd)
 * @param expenses - Array of expense records (supports multi-currency via amountUsd)
 */
export function computeProjectFinancials(
  project: { buyPrice: number | null; salePrice: number | null; listingPrice: number | null },
  costs: { amount: number; currency?: string | null; amountUsd?: number | null }[],
  expenses?: { amount: number; currency?: string | null; amountUsd?: number | null }[]
): ProjectFinancials {
  const bp = safe(project.buyPrice);

  // Costs: usar amountUsd si es ARS con conversion, sino amount directo (USD)
  const totalCosts = costs.reduce((sum, cost) => {
    if (cost.currency === "ARS" && cost.amountUsd != null) {
      return sum + safe(cost.amountUsd);
    }
    return sum + safe(cost.amount);
  }, 0);

  // Expenses: misma logica de conversion
  const expenseList = expenses || [];
  const totalExpenses = expenseList.reduce((sum, exp) => {
    if (exp.currency === "ARS" && exp.amountUsd != null) {
      return sum + safe(exp.amountUsd);
    }
    return sum + safe(exp.amount);
  }, 0);

  const investment = bp + totalCosts + totalExpenses;
  const sp = safe(project.salePrice);
  const lp = safe(project.listingPrice);
  const result = sp > 0 ? sp - investment : 0;
  const margin = sp > 0 && investment > 0 ? (result / investment) * 100 : 0;
  const estimatedMargin =
    lp > 0 && investment > 0 ? ((lp - investment) / investment) * 100 : 0;

  return { totalCosts, totalExpenses, investment, result, margin, estimatedMargin };
}

// ============================================================================
// BUDGET / PRESUPUESTOS
// ============================================================================

interface CotizacionLike {
  amount: number;
  currency?: string | null;
  amountUsd?: number | null;
  isChosen?: boolean;
}

/** Normalize a cotizacion amount to USD */
export function cotizacionUsd(cot: CotizacionLike): number {
  if (cot.currency === "ARS" && cot.amountUsd != null) {
    return safe(cot.amountUsd);
  }
  return safe(cot.amount);
}

interface PartidaLike {
  id: string;
  name: string;
  category: string;
  estimatedAmount?: number | null;
  cotizaciones?: CotizacionLike[];
}

/** Projected USD for a partida: chosen > min cotizacion > estimatedAmount > 0 */
export function partidaProjectedUsd(partida: PartidaLike): number {
  const cots = partida.cotizaciones || [];
  const chosen = cots.find((c) => c.isChosen);
  if (chosen) return cotizacionUsd(chosen);
  if (cots.length > 0) {
    return Math.min(...cots.map(cotizacionUsd));
  }
  return safe(partida.estimatedAmount);
}

interface CostLike {
  amount: number;
  currency?: string | null;
  amountUsd?: number | null;
  partidaId?: string | null;
}

export interface BudgetRubroResult {
  partidaId: string;
  name: string;
  category: string;
  projected: number;
  executed: number;
  deviation: number;
  pct: number;
}

export interface BudgetProjectionResult {
  totalProjected: number;
  totalExecuted: number;
  deviation: number;
  byRubro: BudgetRubroResult[];
}

/** Compute budget projection across all partidas vs executed costs */
export function computeBudgetProjection(
  partidas: PartidaLike[],
  costs: CostLike[]
): BudgetProjectionResult {
  const byRubro: BudgetRubroResult[] = partidas.map((p) => {
    const projected = partidaProjectedUsd(p);
    const executed = costs
      .filter((c) => c.partidaId === p.id)
      .reduce((sum, c) => {
        if (c.currency === "ARS" && c.amountUsd != null) {
          return sum + safe(c.amountUsd);
        }
        return sum + safe(c.amount);
      }, 0);
    const deviation = projected - executed;
    const pct = projected > 0 ? (executed / projected) * 100 : 0;
    return { partidaId: p.id, name: p.name, category: p.category, projected, executed, deviation, pct };
  });

  const totalProjected = byRubro.reduce((s, r) => s + r.projected, 0);
  const totalExecuted = byRubro.reduce((s, r) => s + r.executed, 0);
  const deviation = totalProjected - totalExecuted;

  return { totalProjected, totalExecuted, deviation, byRubro };
}

// ============================================================================
// PANTALLA 2a — MARGEN PROYECTADO, AVANCE POR ETAPAS Y ALERTAS
// (ver SISTEMA.md: una sola base de cálculo en toda la app)
// ============================================================================

/** Pesos de las 5 etapas de obra (suman 100). */
export const ETAPAS_PESOS = {
  estructura: 15,
  instalaciones: 12,
  obraGruesa: 20,
  terminaciones: 37,
  exterior: 16,
} as const;

export type EtapaKey = keyof typeof ETAPAS_PESOS;

export const ETAPAS_LABELS: Record<EtapaKey, string> = {
  estructura: "Estructura",
  instalaciones: "Instalaciones",
  obraGruesa: "Obra gruesa",
  terminaciones: "Terminaciones",
  exterior: "Exterior",
};

export type EtapasAvance = Partial<Record<EtapaKey, number>>;

/** Avance físico ponderado (0-100) = Σ (peso × %etapa) */
export function computeAvancePonderado(etapas: EtapasAvance | null | undefined): number {
  if (!etapas) return 0;
  let total = 0;
  (Object.keys(ETAPAS_PESOS) as EtapaKey[]).forEach((k) => {
    const pct = Math.min(100, Math.max(0, safe(etapas[k])));
    total += (ETAPAS_PESOS[k] * pct) / 100;
  });
  return total;
}

/** Semáforo de margen — mismos cortes en toda la app. */
export type SemaforoMargen = "verde" | "ambar" | "rojo";
export function semaforoMargen(margenPct: number): SemaforoMargen {
  if (margenPct >= 15) return "verde";
  if (margenPct >= 10) return "ambar";
  return "rojo";
}

export interface ObraProyeccion {
  /** compra + costos de obra + gastos mensuales */
  inversionActual: number;
  /** Σ max(0, presupuesto_rubro − ejecutado_rubro): lo que falta ejecutar sin contar excesos */
  presupuestoRestante: number;
  /** inversionActual + presupuestoRestante */
  cierreEstimado: number;
  /** precio al que apuntamos vender (listingPrice) o venta real si está vendida */
  ventaReferencia: number;
  /** ventaReferencia − cierreEstimado */
  ganancia: number;
  /** ganancia / ventaReferencia × 100 — SIEMPRE sobre la venta, nunca sobre inversión */
  margenProyectado: number;
  semaforo: SemaforoMargen;
  /** presupuesto de obra total (Σ proyectado por rubro) */
  presupuestoTotal: number;
  /** costos de obra ejecutados que están vinculados a un rubro */
  ejecutadoEnPresupuesto: number;
}

/**
 * Proyección central de la obra. Base de cálculo no negociable:
 *   inversionActual  = compra + costosObra + gastosMensuales
 *   cierreEstimado   = inversionActual + presupuestoRestante
 *   ganancia         = ventaReferencia − cierreEstimado
 *   margenProyectado = ganancia / ventaReferencia
 *
 * Un costo dentro de presupuesto NO mueve el margen (pasa plata de
 * presupuestoRestante a costosObra). El margen se mueve solo cuando un rubro
 * se excede, aparece un costo sin presupuestar o cambia la venta objetivo.
 */
export function computeObraProyeccion(params: {
  buyPrice: number | null | undefined;
  totalCosts: number;
  totalExpenses: number;
  /** venta objetivo (listingPrice); si la obra está vendida pasar salePrice */
  ventaReferencia: number | null | undefined;
  partidas: { id: string; name: string; category: string; estimatedAmount?: number | null; cotizaciones?: { amount: number; currency?: string | null; amountUsd?: number | null; isChosen?: boolean }[] }[];
  costs: { amount: number; currency?: string | null; amountUsd?: number | null; partidaId?: string | null }[];
}): ObraProyeccion {
  const inversionActual = safe(params.buyPrice) + safe(params.totalCosts) + safe(params.totalExpenses);
  const budget = computeBudgetProjection(params.partidas, params.costs);

  // Restante por rubro con piso en 0: un rubro excedido no "devuelve" plata.
  const presupuestoRestante = budget.byRubro.reduce(
    (sum, r) => sum + Math.max(0, r.projected - r.executed),
    0
  );

  const cierreEstimado = inversionActual + presupuestoRestante;
  const ventaReferencia = safe(params.ventaReferencia);
  const ganancia = ventaReferencia > 0 ? ventaReferencia - cierreEstimado : 0;
  const margenProyectado = ventaReferencia > 0 ? (ganancia / ventaReferencia) * 100 : 0;

  return {
    inversionActual,
    presupuestoRestante,
    cierreEstimado,
    ventaReferencia,
    ganancia,
    margenProyectado,
    semaforo: semaforoMargen(margenProyectado),
    presupuestoTotal: budget.totalProjected,
    ejecutadoEnPresupuesto: budget.totalExecuted,
  };
}

export interface GastoVsAvance {
  /** % del presupuesto de obra ya gastado */
  usadoPct: number;
  /** avance físico ponderado 0-100 */
  avancePct: number;
  /** usadoPct − avancePct, en puntos porcentuales */
  deltaPp: number;
  /** true cuando el gasto le lleva más de 15pp al avance */
  alerta: boolean;
  /** costosObra / avance: cuánto cerraría la obra al ritmo actual (null sin avance) */
  proyeccionAlRitmo: number | null;
}

/** Alerta más útil del panel: comparar plata gastada contra obra construida. */
export function computeGastoVsAvance(params: {
  /** costos de obra ejecutados (total) */
  costosObra: number;
  /** presupuesto de obra total */
  presupuestoTotal: number;
  etapas: EtapasAvance | null | undefined;
}): GastoVsAvance {
  const avancePct = computeAvancePonderado(params.etapas);
  const usadoPct =
    params.presupuestoTotal > 0 ? (safe(params.costosObra) / params.presupuestoTotal) * 100 : 0;
  const deltaPp = usadoPct - avancePct;
  const proyeccionAlRitmo =
    avancePct > 0 ? safe(params.costosObra) / (avancePct / 100) : null;
  return {
    usadoPct,
    avancePct,
    deltaPp,
    alerta: deltaPp > 15,
    proyeccionAlRitmo,
  };
}
