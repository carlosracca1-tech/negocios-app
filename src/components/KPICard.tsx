"use client";

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  color?: string;
  bold?: boolean;
}

export default function KPICard({ label, value, sub, subColor, color, bold }: KPICardProps) {
  return (
    <div
      className="kpi-card"
      style={{
        background: "var(--surface-1)",
        backdropFilter: "blur(12px)",
        borderRadius: 14,
        padding: "16px 18px",
        boxShadow: "var(--shadow-card)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-card-hover)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-card)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Hairline luminosa arriba */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, var(--border-strong), transparent)",
        opacity: 0.5, pointerEvents: "none",
      }} />
      <div
        className="kpi-label"
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 6,
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>
      <div
        className="kpi-value tabular"
        style={{
          fontSize: 20,
          fontWeight: bold ? 800 : 700,
          color: color || "var(--text-primary)",
          letterSpacing: "-0.4px",
          lineHeight: 1.15,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            color: subColor || "var(--text-secondary)",
            fontWeight: 600,
            marginTop: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
