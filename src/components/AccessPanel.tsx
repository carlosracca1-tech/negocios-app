"use client";

import { ProjectAccess } from "@/types";

interface AccessPanelProps {
  access: ProjectAccess[];
  onShareClick: () => void;
}

export default function AccessPanel({ access, onShareClick }: AccessPanelProps) {

  const roleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    ver: { label: "Solo ver", color: "var(--text-secondary)", bgColor: "rgba(136, 153, 176, 0.1)" },
    interactuar: { label: "Ver + Interactuar", color: "var(--text-primary)", bgColor: "rgba(56, 189, 248, 0.1)" },
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Acceso ({access.length})
        </div>
        <button
          onClick={onShareClick}
          style={{
            background: "var(--accent)",
            border: "none",
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--accent-on)",
            cursor: "pointer",
            boxShadow: "0 2px 12px rgba(56, 189, 248, 0.2)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(56, 189, 248, 0.35)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(56, 189, 248, 0.2)")}
        >
          + Invitar
        </button>
      </div>

      {access.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-tertiary)" }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>Sin comparticiones</div>
          <button
            onClick={onShareClick}
            style={{
              background: "transparent",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--surface-2)";
              e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.borderColor = "var(--border-strong)";
            }}
          >
            + Compartir proyecto
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {access.map((a) => {
            const user = a.user;
            const roleInfo = roleConfig[a.role] || roleConfig.ver;
            return (
              <div
                key={a.id}
                style={{
                  background: "var(--surface-1)",
                  borderRadius: 10,
                  border: "1px solid var(--border-faint)",
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--surface-3)";
                  e.currentTarget.style.background = "var(--surface-1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--surface-1)";
                  e.currentTarget.style.background = "var(--surface-1)";
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {user?.name || "Usuario"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                    {user?.email}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: roleInfo.color,
                    background: roleInfo.bgColor,
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  {roleInfo.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
