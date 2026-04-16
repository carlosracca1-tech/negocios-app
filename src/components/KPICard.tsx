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
    <div className="kpi-card" style={{
      background: "rgba(12, 21, 36, 0.6)",
      backdropFilter: "blur(12px)",
      borderRadius: 14,
      padding: "16px 18px",
      border: "1px solid rgba(56, 189, 248, 0.08)",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      cursor: "default",
      position: "relative",
      overflow: "hidden",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "rgba(17, 29, 48, 0.8)";
      e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.18)";
      e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.2), 0 0 15px rgba(56, 189, 248, 0.06)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "rgba(12, 21, 36, 0.6)";
      e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.08)";
      e.currentTarget.style.boxShadow = "none";
    }}>
      <div className="kpi-label" style={{ fontSize: 10, color: "#5a6b82", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, fontWeight: 600 }}>
        {label}
      </div>
      <div className="kpi-value" style={{ fontSize: 22, fontWeight: bold ? 800 : 700, color: color || "#e8edf5", letterSpacing: "-0.5px" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: subColor || "#8899b0", fontWeight: 600, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
