"use client";

import { ProjectAccess } from "@/types";

interface AccessPanelProps {
  access: ProjectAccess[];
  users?: Array<{ id: string; name: string; email: string }>;
  onShareClick: () => void;
}

export default function AccessPanel({ access, users = [], onShareClick }: AccessPanelProps) {
  // Map user IDs to names
  const userMap = new Map(users.map((u) => [u.id, u]));

  const roleConfig: Record<string, { label: string; color: string }> = {
    ver: { label: "Solo ver", color: "#999" },
    interactuar: { label: "Ver + Interactuar", color: "#1565C0" },
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>
          Acceso ({access.length})
        </div>
        <button
          onClick={onShareClick}
          style={{
            background: "#1B3A5C",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          + Invitar
        </button>
      </div>

      {access.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "#999" }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>Sin comparticiones</div>
          <button
            onClick={onShareClick}
            style={{
              background: "#E3F2FD",
              border: "1px solid #BBDEFB",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: "#1565C0",
              cursor: "pointer",
            }}
          >
            + Compartir proyecto
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {access.map((a) => {
            const user = userMap.get(a.userId);
            const roleInfo = roleConfig[a.role] || roleConfig.ver;
            return (
              <div
                key={a.id}
                style={{
                  background: "#FAFBFC",
                  borderRadius: 8,
                  border: "1px solid #f0f0f0",
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
                    {user?.name || "Usuario"}
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                    {user?.email}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: roleInfo.color,
                    background: roleInfo.color + "15",
                    padding: "3px 8px",
                    borderRadius: 4,
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
