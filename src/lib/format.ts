/**
 * Shared formatting utilities for the Negocios app
 *
 * REGLA: todo monto pasa por fmtMoney. Nada de toLocaleString suelto.
 */

/** Safely convert a nullable value to a finite number, defaulting to 0 */
export const safeNum = (n: number | string | null | undefined): number => {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return isFinite(v) ? v : 0;
};

/**
 * Formato único de montos. Miles con punto, decimales con coma.
 *
 * - Totales/KPIs: fmtMoney(108458) → "USD 108.458"
 * - Tablas (2 dec): fmtMoney(1294.5, "USD", { decimales: 2 }) → "USD 1.294,50"
 * - ARS: fmtMoney(2000000, "ARS") → "ARS 2.000.000"
 * - Con signo: fmtMoney(63593, "USD", { signo: true }) → "+USD 63.593"
 * - Negativo con signo: fmtMoney(-1196, "USD", { signo: true }) → "−USD 1.196"
 */
export function fmtMoney(
  n: number | null | undefined,
  moneda: "USD" | "ARS" = "USD",
  opts?: { decimales?: number; signo?: boolean }
): string {
  const v = safeNum(n);
  const abs = Math.abs(v);
  const dec = opts?.decimales ?? 0;

  let formatted: string;
  if (dec > 0) {
    formatted = abs.toLocaleString("de-DE", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });
  } else {
    formatted = Math.round(abs).toLocaleString("de-DE");
  }

  const prefix = opts?.signo ? (v >= 0 ? "+" : "\u2212") : "";
  return `${prefix}${moneda} ${formatted}`;
}

/** "285.250" — solo el número, miles con punto, sin moneda */
export const fmtNum = (n: number | null | undefined): string => {
  return Math.round(Math.abs(safeNum(n))).toLocaleString("de-DE");
};

/** "7,2%" — coma decimal. Decimales por defecto: 1 */
export const fmtPct = (n: number | null | undefined, decimales = 1): string => {
  const v = safeNum(n);
  return v.toFixed(decimales).replace(".", ",") + "%";
};

export const daysAgo = (dateStr: string | Date): string => {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "\u2014";
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  if (diff < 7) return `${diff}d`;
  if (diff < 30) return `${Math.floor(diff / 7)}sem`;
  return `${Math.floor(diff / 30)}m`;
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
  if (!d) return "\u2014";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "\u2014";
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
  const ahora = new Date();
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
