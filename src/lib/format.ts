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
