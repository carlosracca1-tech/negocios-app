/**
 * Shared formatting utilities for the Negocios app
 */

/** Safely convert a nullable value to a finite number, defaulting to 0 */
export const safeNum = (n: number | string | null | undefined): number => {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return isFinite(v) ? v : 0;
};

export const fmt = (n: number | null | undefined): string => {
  const v = safeNum(n);
  return "$" + Math.abs(v).toLocaleString("en-US");
};

export const fmtSign = (n: number | null | undefined): string => {
  const v = safeNum(n);
  return (v >= 0 ? "+" : "-") + "$" + Math.abs(v).toLocaleString("en-US");
};

export const fmtPct = (n: number | null | undefined): string => {
  const v = safeNum(n);
  return v.toFixed(1) + "%";
};

export const daysAgo = (dateStr: string | Date): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  if (diff < 7) return `${diff}d`;
  if (diff < 30) return `${Math.floor(diff / 7)}sem`;
  return `${Math.floor(diff / 30)}m`;
};

// ============================================================================
// Formato es-AR (pantalla 2a): miles con punto, decimales con coma.
// USD siempre es el número principal.
// ============================================================================

/** "USD 285.250" — miles con punto, sin decimales */
export const fmtUsd = (n: number | null | undefined): string => {
  const v = safeNum(n);
  return "USD " + Math.round(Math.abs(v)).toLocaleString("de-DE");
};

/** "285.250" — solo el número, miles con punto */
export const fmtNum = (n: number | null | undefined): string => {
  return Math.round(Math.abs(safeNum(n))).toLocaleString("de-DE");
};

/** "+USD 41.154" / "−USD 12.000" */
export const fmtUsdSign = (n: number | null | undefined): string => {
  const v = safeNum(n);
  return (v >= 0 ? "+" : "−") + "USD " + Math.round(Math.abs(v)).toLocaleString("de-DE");
};

/** "12,1%" — un decimal, coma decimal */
export const fmtPctAr = (n: number | null | undefined, decimals = 1): string => {
  const v = safeNum(n);
  return v.toFixed(decimals).replace(".", ",") + "%";
};

/**
 * Formatea una fecha que es "solo fecha" (buyDate, saleDate, period, etc.)
 * usando timeZone UTC para evitar el corrimiento de un día.
 * Devuelve dd/mm/aaaa en formato argentino.
 */
export const fmtFecha = (
  d: Date | string | null | undefined,
  opts?: { sinAnio?: boolean }
): string => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  if (opts?.sinAnio) {
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "UTC",
    });
  }
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
};

/**
 * Devuelve un string yyyy-MM-dd para precargar inputs type="date",
 * usando UTC para que no se corra un día.
 */
export const fmtFechaInput = (d: Date | string | null | undefined): string => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Días calendario entre una fecha y hoy, en hora de Argentina (UTC-3).
 * Positivo = futuro, negativo = pasado.
 */
export function diasHasta(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return null;
  // Ambas fechas en UTC para comparar solo la fecha, sin hora
  const ahora = new Date();
  // Argentina es UTC-3, ajustamos la hora actual
  const argMs = ahora.getTime() - 3 * 60 * 60 * 1000;
  const argDate = new Date(argMs);
  const hoyUtc = Date.UTC(argDate.getUTCFullYear(), argDate.getUTCMonth(), argDate.getUTCDate());
  const targetUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((targetUtc - hoyUtc) / 86400000);
}

/**
 * Texto de vencimiento para un gasto.
 * "vence hoy", "vence mañana", "vence en N días", "venció hace N días"
 */
export function textoVencimiento(d: Date | string | null | undefined): string | null {
  const dias = diasHasta(d);
  if (dias === null) return null;
  if (dias === 0) return "vence hoy";
  if (dias === 1) return "vence mañana";
  if (dias > 1) return `vence en ${dias} días`;
  return `venció hace ${Math.abs(dias)} día${Math.abs(dias) > 1 ? "s" : ""}`;
}
