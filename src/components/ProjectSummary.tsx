"use client";

import { useMemo } from "react";
import { Cost, Expense } from "@/types";
import { fmt, fmtSign, fmtPct, safeNum } from "@/lib/format";

/**
 * ProjectSummary — vista del "Resumen" del proyecto.
 *
 * Estructura:
 *  1. KPIs principales (Compra · Inversión · Venta · Resultado)
 *  2. Dos donut charts (por categoría y por tipo de gasto)
 *  3. Insights generados automáticamente
 *  4. Treemap de costos (desktop) / lista de barras (mobile)
 *  5. Comparativo vs. metas
 *
 * Diseño:
 *  - Usa CSS variables del tema (var(--accent), var(--surface-1), etc.)
 *  - Auto-adapta entre dark y light mode
 *  - Responsive: KPIs colapsan a 2 cols, pies se apilan, treemap pasa a barras
 *  - Tipografía con clamp() y min-width:0 para evitar overflow
 */

interface ProjectSummaryProps {
  projectType: "Casa" | "Auto";
  status: string;
  costs: Cost[];
  expenses: Expense[];
  buyPrice: number;
  totalCosts: number;
  totalExpenses: number;
  investment: number;
  salePrice: number;
  listingPrice: number;
  result: number | null;
  margin: number | null;
  estimatedMargin: number | null;
  daysActive: number;
}

// 7 shades para charts — las variables auto-invierten entre dark y light
const SHADE_VARS = ["--shade-1", "--shade-2", "--shade-3", "--shade-4", "--shade-5", "--shade-6", "--shade-7"];

const TYPE_COLOR_VAR: Record<string, string> = {
  material: "--shade-1",     // dominante / más prominente
  repuesto: "--shade-1",
  servicio: "--shade-3",
  mano_de_obra: "--shade-4",
  tramite: "--warning",      // único color funcional que destaca
};

const TYPE_LABELS_CASA: Record<string, string> = {
  material: "Material",
  mano_de_obra: "Mano de obra",
  servicio: "Servicio",
  tramite: "Trámite",
};

const TYPE_LABELS_AUTO: Record<string, string> = {
  repuesto: "Repuesto",
  mano_de_obra: "Mano de obra",
  servicio: "Service",
  tramite: "Trámite",
};

const normalizeType = (t: string): string => (t === "repuesto" ? "material" : t);

const costUsd = (c: Cost): number => {
  if (c.currency === "ARS" && c.amountUsd != null) return safeNum(c.amountUsd);
  return safeNum(c.amount);
};

export default function ProjectSummary({
  projectType,
  costs,
  expenses,
  buyPrice,
  totalCosts,
  totalExpenses,
  investment,
  salePrice,
  listingPrice,
  result,
  margin,
  estimatedMargin,
  daysActive,
}: ProjectSummaryProps) {
  const hasSale = salePrice > 0;
  const typeLabels = projectType === "Auto" ? TYPE_LABELS_AUTO : TYPE_LABELS_CASA;

  // === Agregaciones ===
  const byCategory = useMemo(() => {
    const map: Record<string, { total: number; types: Record<string, number> }> = {};
    costs.forEach((c) => {
      const v = costUsd(c);
      if (!map[c.category]) map[c.category] = { total: 0, types: {} };
      map[c.category].total += v;
      const t = normalizeType(c.costType);
      map[c.category].types[t] = (map[c.category].types[t] || 0) + v;
    });
    return Object.entries(map)
      .map(([cat, data]) => ({ cat, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [costs]);

  const byType = useMemo(() => {
    const map: Record<string, number> = { material: 0, mano_de_obra: 0, servicio: 0, tramite: 0 };
    costs.forEach((c) => {
      const t = normalizeType(c.costType);
      map[t] = (map[t] || 0) + costUsd(c);
    });
    return [
      { key: "material", label: typeLabels.material || "Material", value: map.material, colorVar: TYPE_COLOR_VAR.material },
      { key: "servicio", label: typeLabels.servicio || "Servicio", value: map.servicio, colorVar: TYPE_COLOR_VAR.servicio },
      { key: "tramite", label: typeLabels.tramite || "Trámite", value: map.tramite, colorVar: TYPE_COLOR_VAR.tramite },
      { key: "mano_de_obra", label: typeLabels.mano_de_obra || "Mano de obra", value: map.mano_de_obra, colorVar: TYPE_COLOR_VAR.mano_de_obra },
    ];
  }, [costs, typeLabels]);

  const costRatio = buyPrice > 0 ? (totalCosts / buyPrice) * 100 : 0;
  const annualizedMargin = margin !== null && daysActive > 0 ? margin / (daysActive / 365) : null;

  const dominantType = (cat: typeof byCategory[number]): string => {
    const entries = Object.entries(cat.types);
    if (entries.length === 0) return "material";
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  };

  // === Insights ===
  const insights = useMemo(() => {
    const arr: { kind: "info" | "warning" | "success" | "danger"; title: string; text: React.ReactNode }[] = [];

    if (byCategory.length > 0 && totalCosts > 0) {
      const top = byCategory[0];
      const pct = (top.total / totalCosts) * 100;
      arr.push({
        kind: "success",
        title: "📊 Top categoría",
        text: (<><strong>{top.cat}</strong> fue donde más se gastó: <strong>{fmt(top.total)}</strong> ({pct.toFixed(0)}% del total).</>),
      });
    }

    if (buyPrice > 0 && totalCosts > 0) {
      if (costRatio > 60) {
        arr.push({
          kind: "warning",
          title: "⚠ Alto ratio costos/compra",
          text: (<>Gastaste <strong>{costRatio.toFixed(0)}%</strong> del precio de compra. Lo saludable suele estar por debajo del 60%.</>),
        });
      } else {
        arr.push({
          kind: "success",
          title: "✓ Costos contenidos",
          text: (<>Gastaste <strong>{costRatio.toFixed(0)}%</strong> del precio de compra — dentro del rango saludable.</>),
        });
      }
    }

    if (hasSale && margin !== null) {
      if (margin >= 15) {
        arr.push({ kind: "success", title: "📈 Margen final", text: (<><strong>{margin.toFixed(1)}%</strong> — buen resultado, por encima de la meta típica de 15%.</>) });
      } else if (margin >= 0) {
        arr.push({ kind: "warning", title: "📉 Margen final", text: (<><strong>{margin.toFixed(1)}%</strong> — positivo pero por debajo del 15% objetivo.</>) });
      } else {
        arr.push({ kind: "danger", title: "📉 Resultado negativo", text: (<>Pérdida de <strong>{Math.abs(margin).toFixed(1)}%</strong> sobre la inversión total.</>) });
      }
    } else if (estimatedMargin !== null && listingPrice > 0) {
      arr.push({
        kind: estimatedMargin >= 15 ? "success" : estimatedMargin >= 0 ? "warning" : "danger",
        title: "📊 Margen estimado",
        text: (<>Con el valor de publicación actual, el margen estimado sería <strong>{estimatedMargin.toFixed(1)}%</strong>.</>),
      });
    }

    if (daysActive > 0) {
      const years = daysActive / 365;
      if (annualizedMargin !== null && years >= 0.5) {
        arr.push({ kind: "info", title: "📅 Tiempo activo", text: (<><strong>{daysActive} días</strong> ({years.toFixed(1)} años). Margen anualizado: <strong>{annualizedMargin.toFixed(1)}%/año</strong>.</>) });
      } else {
        arr.push({ kind: "info", title: "📅 Días activo", text: (<><strong>{daysActive} días</strong> desde la compra.</>) });
      }
    }

    const totalByType = byType.reduce((s, t) => s + t.value, 0);
    if (totalByType > 0) {
      const main = byType.slice().sort((a, b) => b.value - a.value)[0];
      const mainPct = (main.value / totalByType) * 100;
      arr.push({
        kind: "info",
        title: "🏷 Composición",
        text: (<><strong>{main.label}</strong> representa el <strong>{mainPct.toFixed(0)}%</strong> de los costos.</>),
      });
    }

    if (costs.length > 0 || expenses.length > 0) {
      arr.push({
        kind: "info",
        title: "📦 Registros",
        text: (<><strong>{costs.length}</strong> costos y <strong>{expenses.length}</strong> gastos mensuales cargados en {byCategory.length} categorías.</>),
      });
    }

    return arr;
  }, [byCategory, byType, totalCosts, buyPrice, costRatio, hasSale, margin, estimatedMargin, listingPrice, daysActive, annualizedMargin, costs.length, expenses.length]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ============ FILA DE KPIs ============ */}
      <div className="kpi-grid-4">
        <KpiCard label="Compra" value={fmt(buyPrice)} />
        <KpiCard
          label="Inversión total"
          value={fmt(investment)}
          sub={totalCosts + totalExpenses > 0 ? `+${fmt(totalCosts + totalExpenses)} en obra` : undefined}
        />
        {hasSale ? (
          <KpiCard label="Venta" value={fmt(salePrice)} />
        ) : (
          <KpiCard label="Valor publicación" value={listingPrice > 0 ? fmt(listingPrice) : "—"} />
        )}
        {hasSale && result !== null ? (
          <KpiCard
            label="Resultado"
            value={fmtSign(result)}
            valueColor={result >= 0 ? "var(--success)" : "var(--danger)"}
            labelColor={result >= 0 ? "var(--success)" : "var(--danger)"}
            sub={margin !== null ? `${margin.toFixed(1)}% de margen` : undefined}
            subColor={result >= 0 ? "var(--success)" : "var(--danger)"}
            featured={result >= 0}
          />
        ) : estimatedMargin !== null ? (
          <KpiCard
            label="Margen estimado"
            value={fmtPct(estimatedMargin)}
            valueColor={estimatedMargin >= 0 ? "var(--success)" : "var(--danger)"}
            sub="Con valor de publicación"
          />
        ) : (
          <KpiCard label="Resultado" value="—" sub="Sin venta ni publicación" />
        )}
      </div>

      {/* ============ DOS DONUTS ============ */}
      {totalCosts > 0 && (
        <div className="pie-grid">
          <PieCard
            title="Por categoría"
            subtitle={`${fmt(totalCosts)} en ${byCategory.length} ${byCategory.length === 1 ? "área" : "áreas"}`}
            data={byCategory.map(({ cat, total }, i) => ({
              label: cat,
              value: total,
              colorVar: SHADE_VARS[i % SHADE_VARS.length],
            }))}
            totalLabel={fmt(totalCosts)}
          />
          <PieCard
            title="Por tipo de gasto"
            subtitle="Material · Mano de obra · Servicio · Trámite"
            data={byType.filter((t) => t.value > 0).map((t) => ({
              label: t.label,
              value: t.value,
              colorVar: t.colorVar,
            }))}
            totalLabel={fmt(totalCosts)}
          />
        </div>
      )}

      {/* ============ INSIGHTS ============ */}
      {insights.length > 0 && (
        <GlassCard>
          <SectionLabel>Lecciones del proyecto</SectionLabel>
          <div className="insight-grid">
            {insights.map((ins, i) => (
              <InsightCard key={i} {...ins} />
            ))}
          </div>
        </GlassCard>
      )}

      {/* ============ TREEMAP / BARRAS ============ */}
      {byCategory.length > 0 && (
        <GlassCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Mapa de costos</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                Cada bloque proporcional al monto · color según tipo
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--text-tertiary)", flexWrap: "wrap" }}>
              <LegendDot colorVar={TYPE_COLOR_VAR.material} label={typeLabels.material || "Material"} />
              <LegendDot colorVar={TYPE_COLOR_VAR.mano_de_obra} label={typeLabels.mano_de_obra || "Mano de obra"} />
              <LegendDot colorVar={TYPE_COLOR_VAR.servicio} label={typeLabels.servicio || "Servicio"} />
              <LegendDot colorVar={TYPE_COLOR_VAR.tramite} label="Trámite" />
            </div>
          </div>
          <ResponsiveTreemap
            categories={byCategory}
            dominantType={dominantType}
            totalCosts={totalCosts}
            typeLabels={typeLabels}
          />
        </GlassCard>
      )}

      {/* ============ COMPARATIVO ============ */}
      <GlassCard>
        <SectionLabel>Comparativo vs. metas</SectionLabel>
        <CompareRow
          label="Costos / precio de compra"
          sub="Meta: máximo 60%"
          value={costRatio}
          maxScale={Math.max(120, costRatio + 20)}
          targetPct={60}
          color={costRatio > 60 ? "warn" : "good"}
          fillLabel={`${costRatio.toFixed(0)}%${costRatio > 60 ? " — pasamos la meta" : ""}`}
        />
        {hasSale && margin !== null ? (
          <>
            <CompareRow
              label="Margen final"
              sub="Meta: 15% mínimo"
              value={Math.max(0, margin)}
              maxScale={25}
              targetPct={15}
              color={margin >= 15 ? "good" : margin >= 0 ? "warn" : "danger"}
              fillLabel={`${margin.toFixed(1)}%`}
            />
            <CompareRow
              label="Resultado en USD"
              sub="Ganancia neta del proyecto"
              value={Math.abs(result ?? 0)}
              maxScale={Math.abs(result ?? 0) * 1.4 || 100}
              color={(result ?? 0) >= 0 ? "good" : "danger"}
              fillLabel={fmtSign(result ?? 0)}
            />
          </>
        ) : estimatedMargin !== null ? (
          <CompareRow
            label="Margen estimado"
            sub="Si se vende al valor de publicación"
            value={Math.max(0, estimatedMargin)}
            maxScale={25}
            targetPct={15}
            color={estimatedMargin >= 15 ? "good" : estimatedMargin >= 0 ? "warn" : "danger"}
            fillLabel={`${estimatedMargin.toFixed(1)}%`}
          />
        ) : null}
      </GlassCard>
    </div>
  );
}

// =====================================================================
// SUB-COMPONENTES
// =====================================================================

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: 22,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)",
      textTransform: "uppercase", letterSpacing: 1, marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function LegendDot({ colorVar, label }: { colorVar: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: `var(${colorVar})` }} />
      {label}
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  labelColor?: string;
  subColor?: string;
  featured?: boolean;
}

function KpiCard({ label, value, sub, valueColor, labelColor, subColor, featured }: KpiCardProps) {
  return (
    <div
      className="kpi-card"
      style={{
        padding: 16,
        minWidth: 0,
        background: featured
          ? "linear-gradient(135deg, var(--success-soft), transparent 60%), var(--surface-1)"
          : "var(--surface-1)",
        borderRadius: 12,
        boxShadow: featured
          ? "0 1px 0 0 var(--success-border) inset, 0 8px 24px -8px rgba(0,0,0,0.4), 0 0 0 1px var(--success-border), 0 0 40px -10px var(--success-soft)"
          : "var(--shadow-card)",
        backdropFilter: "blur(20px)",
        transition: "transform 0.2s, box-shadow 0.2s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        if (!featured) e.currentTarget.style.boxShadow = "var(--shadow-card-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        if (!featured) e.currentTarget.style.boxShadow = "var(--shadow-card)";
      }}
    >
      <div className="kpi-label" style={{
        fontSize: 10, fontWeight: 600,
        color: labelColor || "var(--text-tertiary)",
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {label}
      </div>
      <div className="kpi-value tabular" style={{
        fontSize: 22,
        fontWeight: 700,
        color: valueColor || "var(--text-primary)",
        lineHeight: 1.15,
        letterSpacing: "-0.4px",
        whiteSpace: "nowrap",
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: 11, color: subColor || "var(--text-secondary)",
          marginTop: 8,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Donut chart en SVG puro (usa variables CSS para los colores)
// ============================================================
interface PieDataPoint { label: string; value: number; colorVar: string; }

function DonutChart({ data, totalLabel }: { data: PieDataPoint[]; totalLabel?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const size = 200;
  const stroke = 28;
  const r = size / 2 - stroke / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;

  let cumulative = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" style={{ maxHeight: 220, display: "block" }}>
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {data.map((d, i) => {
          const pct = d.value / total;
          const arcLen = pct * C;
          const dasharray = `${arcLen} ${C - arcLen}`;
          const offset = -cumulative * C;
          cumulative += pct;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={`var(${d.colorVar})`}
              strokeWidth={stroke}
              strokeDasharray={dasharray}
              strokeDashoffset={offset}
            />
          );
        })}
      </g>
      <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text-tertiary)" fontSize="10" letterSpacing="1.2" style={{ textTransform: "uppercase" }}>
        Total
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--text-primary)" fontSize="16" fontWeight="700" letterSpacing="-0.3">
        {totalLabel || fmt(total)}
      </text>
    </svg>
  );
}

function PieCard({ title, subtitle, data, totalLabel }: { title: string; subtitle: string; data: PieDataPoint[]; totalLabel?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="glass-card" style={{ padding: 22 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{subtitle}</div>
      </div>
      <div className="pie-content">
        <div style={{ position: "relative", minWidth: 0, width: "100%", height: 220 }}>
          <DonutChart data={data} totalLabel={totalLabel} />
        </div>
        <div className="pie-legend" style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          {data.map((d, i) => {
            const pct = (d.value / total) * 100;
            return (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "auto minmax(0, 1fr) auto",
                gap: 8,
                alignItems: "center",
                fontSize: 12,
                padding: "4px 0",
                borderBottom: "1px solid var(--border-faint)",
              }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: `var(${d.colorVar})`, flexShrink: 0 }} />
                <span className="truncate" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {d.label}
                </span>
                <span className="tabular" style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {fmt(d.value)} · {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Insight card
// ============================================================
function InsightCard({ kind, title, text }: {
  kind: "info" | "warning" | "success" | "danger";
  title: string;
  text: React.ReactNode;
}) {
  const colorVar = {
    info: "--accent",
    warning: "--warning",
    success: "--success",
    danger: "--danger",
  }[kind];
  const softVar = {
    info: "--accent-soft",
    warning: "--warning-soft",
    success: "--success-soft",
    danger: "--danger-soft",
  }[kind];

  return (
    <div style={{
      background: "var(--surface-2)",
      borderRadius: 12,
      padding: "14px 16px",
      borderLeft: `3px solid var(${colorVar})`,
      position: "relative",
      overflow: "hidden",
      minWidth: 0,
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `linear-gradient(135deg, var(${softVar}), transparent 60%)`,
      }} />
      <div style={{
        fontSize: 11, fontWeight: 700, color: "var(--text-secondary)",
        marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6,
        position: "relative", zIndex: 1,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5,
        position: "relative", zIndex: 1,
      }}>
        {text}
      </div>
    </div>
  );
}

// ============================================================
// Treemap responsivo: grid en desktop, lista de barras en mobile
// ============================================================
function ResponsiveTreemap({
  categories, dominantType, totalCosts, typeLabels,
}: {
  categories: { cat: string; total: number; types: Record<string, number> }[];
  dominantType: (c: { cat: string; total: number; types: Record<string, number> }) => string;
  totalCosts: number;
  typeLabels: Record<string, string>;
}) {
  const getSpan = (pct: number): { col: number; row: number } => {
    if (pct >= 30) return { col: 6, row: 2 };
    if (pct >= 15) return { col: 3, row: 2 };
    if (pct >= 8) return { col: 3, row: 1 };
    if (pct >= 4) return { col: 2, row: 1 };
    return { col: 2, row: 1 };
  };

  return (
    <>
      {/* DESKTOP: treemap grid (oculto en mobile via CSS) */}
      <div
        className="treemap-desktop"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gridAutoRows: "84px",
          gap: 6,
        }}
      >
        {categories.map((c) => {
          const pct = (c.total / totalCosts) * 100;
          const { col, row } = getSpan(pct);
          const t = dominantType(c);
          const tVar = TYPE_COLOR_VAR[t] || "--shade-1";

          const types = Object.entries(c.types).sort((a, b) => b[1] - a[1]);
          const hasMix = types.length > 1 && types[1][1] / c.total > 0.15;
          const secondVar = hasMix ? TYPE_COLOR_VAR[types[1][0]] || tVar : tVar;

          const typeLabel = hasMix
            ? `${typeLabels[t] || t} + ${typeLabels[types[1][0]] || types[1][0]}`
            : typeLabels[t] || t;

          return (
            <div
              key={c.cat}
              style={{
                gridColumn: `span ${col}`,
                gridRow: `span ${row}`,
                borderRadius: 12,
                padding: 14,
                background: `linear-gradient(135deg, color-mix(in srgb, var(${tVar}) 22%, transparent), color-mix(in srgb, var(${secondVar}) 6%, transparent))`,
                border: `1px solid color-mix(in srgb, var(${tVar}) 25%, transparent)`,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                cursor: "pointer",
                transition: "transform 0.15s, filter 0.15s",
                minWidth: 0, minHeight: 0, overflow: "hidden",
                position: "relative",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.filter = "brightness(1.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.filter = "none"; }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="truncate" style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{c.cat}</div>
                <div className="truncate" style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>
                  {typeLabel}
                </div>
              </div>
              <div>
                <div className="tabular truncate" style={{ fontSize: row >= 2 ? 15 : 13, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
                  {fmt(c.total)}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{pct.toFixed(0)}%</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MOBILE: lista vertical de barras (oculta en desktop via CSS) */}
      <div className="treemap-mobile" style={{ display: "none", flexDirection: "column", gap: 8 }}>
        {categories.map((c) => {
          const pct = (c.total / totalCosts) * 100;
          const t = dominantType(c);
          const tVar = TYPE_COLOR_VAR[t] || "--shade-1";
          const typeLabel = typeLabels[t] || t;
          return (
            <div key={c.cat} style={{
              padding: 12,
              borderRadius: 10,
              background: "var(--surface-2)",
              border: "1px solid var(--border-faint)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 8 }}>
                <div className="truncate" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: `var(${tVar})`, flexShrink: 0 }} />
                  <span className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{c.cat}</span>
                  <span style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.4 }}>{typeLabel}</span>
                </div>
                <div className="tabular" style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                  {fmt(c.total)} <span style={{ color: "var(--text-tertiary)", fontWeight: 500, fontSize: 11 }}>{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `var(${tVar})`, borderRadius: 3 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Las reglas de breakpoint para treemap-desktop/treemap-mobile están en globals.css */}
    </>
  );
}

// ============================================================
// Compare row
// ============================================================
function CompareRow({ label, sub, value, maxScale, targetPct, color, fillLabel }: {
  label: string;
  sub: string;
  value: number;
  maxScale: number;
  targetPct?: number;
  color: "good" | "warn" | "danger";
  fillLabel: string;
}) {
  const widthPct = Math.min(98, Math.max(8, (value / maxScale) * 100));
  const targetLeft = targetPct !== undefined ? (targetPct / maxScale) * 100 : null;

  const styles = {
    good: { bg: "linear-gradient(90deg, var(--success-soft), color-mix(in srgb, var(--success) 35%, transparent))", color: "var(--success)", border: "1px solid var(--success-border)" },
    warn: { bg: "linear-gradient(90deg, var(--warning-soft), color-mix(in srgb, var(--warning) 35%, transparent))", color: "var(--warning)", border: "1px solid var(--warning-border)" },
    danger: { bg: "linear-gradient(90deg, var(--danger-soft), color-mix(in srgb, var(--danger) 35%, transparent))", color: "var(--danger)", border: "1px solid var(--danger-border)" },
  }[color];

  return (
    <div className="compare-row">
      <div style={{ minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ position: "relative", height: 28, background: "var(--surface-2)", borderRadius: 8, minWidth: 0 }}>
        {targetLeft !== null && (
          <div style={{
            position: "absolute", top: -4, bottom: -4,
            left: `${targetLeft}%`, width: 2,
            background: "var(--text-tertiary)", borderRadius: 2,
          }}>
            <div style={{
              position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
              fontSize: 9, color: "var(--text-tertiary)", whiteSpace: "nowrap",
              fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
            }}>meta</div>
          </div>
        )}
        <div className="tabular" style={{
          position: "absolute", top: 0, bottom: 0, left: 0,
          width: `${widthPct}%`, borderRadius: 8,
          background: styles.bg, color: styles.color, border: styles.border,
          display: "flex", alignItems: "center", padding: "0 12px",
          fontSize: 12, fontWeight: 700,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {fillLabel}
        </div>
      </div>
    </div>
  );
}
