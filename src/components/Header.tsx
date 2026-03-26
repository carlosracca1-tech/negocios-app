"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useProjects, useAlerts } from "@/hooks/useProjects";

export default function Header() {
  const { data: session } = useSession();
  const { projects, loading: projectsLoading } = useProjects();
  const { alerts } = useAlerts();
  const [showAlerts, setShowAlerts] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setShowAlerts(false);
      }
    }
    if (showAlerts) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAlerts]);

  // Calculate global KPIs
  const activos = projects.filter((p) => p.status === "activo").length;
  const vendidos = projects.filter((p) => p.status === "vendido").length;
  const invertido = projects.reduce((sum, p) => sum + p.buyPrice + (p.costs || 0), 0);
  const resultado = projects
    .filter((p) => p.salePrice)
    .reduce((sum, p) => sum + (p.salePrice! - (p.buyPrice + (p.costs || 0))), 0);

  const fmt = (n: number) => (n == null ? "—" : "$" + Math.abs(n).toLocaleString("en-US"));

  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 40, position: "sticky", top: 0, zIndex: 100 }}>
      {/* Logo */}
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1B3A5C", whiteSpace: "nowrap" }}>Negocios</div>

      {/* Global KPIs */}
      <div style={{ display: "flex", gap: 32, flex: 1 }}>
        {projectsLoading ? (
          <div style={{ fontSize: 12, color: "#999" }}>Cargando...</div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>Activos</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>{activos}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>Vendidos</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#2E7D32" }}>{vendidos}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>Invertido</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>{fmt(invertido)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>Resultado</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: resultado >= 0 ? "#2E7D32" : "#C62828" }}>{fmt(resultado)}</div>
            </div>
          </>
        )}
      </div>

      {/* Alerts bell + User */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* Alerts dropdown */}
        <div ref={alertsRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              position: "relative",
            }}
          >
            🔔
            {alerts.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  background: "#C62828",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {alerts.length}
              </div>
            )}
          </button>

          {showAlerts && (
            <div
              style={{
                position: "absolute",
                top: 40,
                right: 0,
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: 10,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                width: 320,
                maxHeight: 400,
                overflowY: "auto",
                zIndex: 1000,
              }}
            >
              {alerts.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: "#999" }}>Sin alertas</div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: 12,
                      borderBottom: "1px solid #f0f0f0",
                      fontSize: 12,
                      color: "#555",
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 3,
                        borderRadius: 1.5,
                        background: alert.color,
                        flexShrink: 0,
                      }}
                    />
                    <div>{alert.message}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* User avatar */}
        {session?.user && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#E3F2FD",
              border: "2px solid #fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
              color: "#1565C0",
            }}
          >
            {(session.user as any).name?.charAt(0) || "U"}
          </div>
        )}
      </div>
    </div>
  );
}
