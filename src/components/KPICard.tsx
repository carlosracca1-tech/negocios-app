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
    <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: "1px solid #f0f0f0" }}>
      <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: bold ? 800 : 700, color: color || "#1a1a1a" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: subColor || "#666", fontWeight: 600, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
