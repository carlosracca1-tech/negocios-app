"use client";

import { useState, useMemo } from "react";

interface ProjectAlertsProps {
  buyPrice: number;
  totalCosts: number;
  investment: number;
  listingPrice: number;
  estimatedMargin: number | null;
  salePrice: number;
  totalExpenses: number;
  avgMonthlyExpense: number;
}

interface Alert {
  id: string;
  severity: "danger" | "warning" | "info";
  title: string;
  message: string;
}

export default function ProjectAlerts({
  buyPrice,
  totalCosts,
  investment,
  listingPrice,
  estimatedMargin,
  salePrice,
  totalExpenses,
  avgMonthlyExpense,
}: ProjectAlertsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alerts = useMemo(() => {
    const list: Alert[] = [];
    const costRatio = buyPrice > 0 ? (totalCosts / buyPrice) * 100 : 0;

    // Critical: costs exceed buy price
    if (costRatio > 100) {
      list.push({
        id: "costs-exceed",
        severity: "danger",
        title: "Costos superan el precio de compra",
        message: `Los costos ($${totalCosts.toLocaleString("en-US")}) representan el ${costRatio.toFixed(1)}% del precio de compra.`,
      });
    }

    // Critical: investment exceeds listing price
    if (listingPrice > 0 && investment > listingPrice && !salePrice) {
      list.push({
        id: "inv-exceeds-listing",
        severity: "danger",
        title: "Inversión supera el valor de publicación",
        message: `La inversión total ($${investment.toLocaleString("en-US")}) es mayor al valor de publicación ($${listingPrice.toLocaleString("en-US")}).`,
      });
    }

    // Warning: low margin
    if (estimatedMargin !== null && estimatedMargin < 15 && estimatedMargin >= 0 && !salePrice) {
      list.push({
        id: "low-margin",
        severity: "warning",
        title: "Margen estimado bajo",
        message: `${estimatedMargin.toFixed(1)}% de margen${avgMonthlyExpense > 0 ? ` con gastos de $${Math.round(avgMonthlyExpense).toLocaleString("en-US")}/mes` : ""}. Considerá ajustar el valor de publicación.`,
      });
    }

    // Warning: high cost ratio (but not over 100%)
    if (costRatio > 80 && costRatio <= 100) {
      list.push({
        id: "high-costs",
        severity: "warning",
        title: "Costos elevados",
        message: `Los costos representan el ${costRatio.toFixed(0)}% del precio de compra.`,
      });
    }

    return list;
  }, [buyPrice, totalCosts, investment, listingPrice, estimatedMargin, salePrice, avgMonthlyExpense]);

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) return null;

  const severityStyles = {
    danger: {
      bg: "rgba(239, 68, 68, 0.05)",
      border: "rgba(239, 68, 68, 0.12)",
      dot: "#ef4444",
    },
    warning: {
      bg: "rgba(245, 158, 11, 0.05)",
      border: "rgba(245, 158, 11, 0.12)",
      dot: "#f59e0b",
    },
    info: {
      bg: "rgba(56, 189, 248, 0.05)",
      border: "rgba(56, 189, 248, 0.12)",
      dot: "#38bdf8",
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
      {visibleAlerts.map((alert) => {
        const s = severityStyles[alert.severity];
        return (
          <div
            key={alert.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 10,
              background: s.bg,
              border: `1px solid ${s.border}`,
              fontSize: 13,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: s.dot,
                flexShrink: 0,
                marginTop: 5,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "#e8edf5", marginBottom: 1 }}>
                {alert.title}
              </div>
              <div style={{ fontSize: 12, color: "#8899b0", lineHeight: 1.4 }}>
                {alert.message}
              </div>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
              style={{
                background: "none",
                border: "none",
                color: "#3d4f63",
                cursor: "pointer",
                padding: 2,
                borderRadius: 4,
                flexShrink: 0,
                lineHeight: 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#8899b0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#3d4f63"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
