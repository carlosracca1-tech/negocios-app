"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSharedProjects } from "@/contexts/ProjectsContext";
import { fmt, safeNum } from "@/lib/format";

export default function Header() {
  const { data: session } = useSession();
  const { projects, loading: projectsLoading, alerts } = useSharedProjects();
  const [showAlerts, setShowAlerts] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setNotifications(json.data.filter((n: any) => !n.read));
        }
      })
      .catch(() => {});
  }, []);

  // Use pre-computed fields from API (computed by lib/financial.ts on the server)
  const activosProjects = projects.filter((p) => p.status === "activo");
  const vendidosProjects = projects.filter((p) => p.status === "vendido");
  const activos = activosProjects.length;
  const vendidos = vendidosProjects.length;
  // Invertido: solo proyectos activos (lo vendido ya no está invertido)
  const invertido = activosProjects.reduce((sum, p) => sum + safeNum(p.investment), 0);
  // Resultado: suma de ganancias/pérdidas de operaciones vendidas
  const resultado = vendidosProjects.reduce((sum, p) => sum + safeNum(p.result), 0);
  // Margen promedio: promedio de márgenes individuales de vendidos
  const margenProm = (() => {
    if (vendidosProjects.length === 0) return 0;
    const totalMargin = vendidosProjects.reduce((sum, p) => sum + safeNum(p.margin), 0);
    return totalMargin / vendidosProjects.length;
  })();

  return (
    <div
      className="header-root"
      style={{
        background: "rgba(6, 11, 20, 0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(56, 189, 248, 0.08)",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        gap: 0,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <a
        href="/"
        className="header-logo"
        style={{
          fontSize: 20,
          fontWeight: 800,
          background: "linear-gradient(135deg, #38bdf8 0%, #7dd3fc 40%, #d4a574 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          whiteSpace: "nowrap",
          letterSpacing: "-0.5px",
          marginRight: 40,
          textDecoration: "none",
        }}
      >
        Seguimiento
      </a>

      {/* Global KPIs - hidden on mobile via CSS */}
      <div className="header-kpis" style={{ display: "flex", gap: 4, flex: 1 }}>
        {projectsLoading ? (
          <div style={{ fontSize: 12, color: "#5a6b82" }}>Cargando...</div>
        ) : (
          <>
            {[
              { label: "ACTIVOS", value: String(activos), color: "#38bdf8" },
              { label: "VENDIDOS", value: String(vendidos), color: "#34d399" },
              { label: "INVERTIDO", value: fmt(invertido), color: "#e8d5b7", sublabel: "en activos" },
              { label: "RESULTADO", value: fmt(resultado), color: resultado >= 0 ? "#34d399" : "#f87171", sublabel: "en vendidos" },
              { label: "MARGEN PROM.", value: `${margenProm.toFixed(1)}%`, color: margenProm >= 0 ? "#34d399" : "#f87171", sublabel: "en vendidos" },
            ].map((kpi, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 10,
                  background: "rgba(56, 189, 248, 0.04)",
                  border: "1px solid rgba(56, 189, 248, 0.06)",
                  transition: "all 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(56, 189, 248, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(56, 189, 248, 0.04)";
                  e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.06)";
                }}
              >
                <div>
                  <div style={{ fontSize: 9, color: "#5a6b82", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, lineHeight: 1 }}>
                    {kpi.label}
                    {"sublabel" in kpi && kpi.sublabel && (
                      <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 3, textTransform: "lowercase", letterSpacing: 0 }}>{kpi.sublabel}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: kpi.color, lineHeight: 1.3 }}>{kpi.value}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Spacer for mobile to push right items */}
      <div style={{ flex: 1 }} className="header-kpis" />

      {/* Alerts bell + User */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
        <div ref={alertsRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setShowAlerts(!showAlerts);
              // Mark notifications as read when opening
              if (!showAlerts && notifications.length > 0) {
                fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({}) })
                  .then(() => setNotifications([]))
                  .catch(() => {});
              }
            }}
            style={{
              background: showAlerts ? "rgba(56, 189, 248, 0.1)" : "none",
              border: "none",
              cursor: "pointer",
              position: "relative",
              width: 36,
              height: 36,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8899b0",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(56, 189, 248, 0.1)";
              e.currentTarget.style.color = "#e8edf5";
            }}
            onMouseLeave={(e) => {
              if (!showAlerts) e.currentTarget.style.background = "none";
              e.currentTarget.style.color = "#8899b0";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {(alerts.filter(a => !dismissedAlerts.has(a.id)).length + notifications.length) > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  background: "#ef4444",
                  borderRadius: "50%",
                  width: 8,
                  height: 8,
                  boxShadow: "0 0 6px rgba(239, 68, 68, 0.5)",
                }}
              />
            )}
          </button>

          {showAlerts && (
            <div
              style={{
                position: "absolute",
                top: 44,
                right: 0,
                background: "rgba(12, 21, 36, 0.95)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(56, 189, 248, 0.12)",
                borderRadius: 14,
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(56, 189, 248, 0.06)",
                width: 340,
                maxWidth: "90vw",
                maxHeight: 400,
                overflowY: "auto",
                zIndex: 1000,
                animation: "fadeIn 0.2s ease",
              }}
            >
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(56, 189, 248, 0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e8edf5" }}>
                  Alertas
                </div>
                {alerts.filter(a => !dismissedAlerts.has(a.id)).length > 0 && (
                  <button
                    onClick={() => {
                      const allIds = new Set(alerts.map(a => a.id));
                      setDismissedAlerts(allIds);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: 11,
                      color: "#5a6b82",
                      cursor: "pointer",
                      fontWeight: 500,
                      padding: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#8899b0"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#5a6b82"; }}
                  >
                    Descartar todo
                  </button>
                )}
              </div>
              {alerts.filter(a => !dismissedAlerts.has(a.id)).length === 0 && notifications.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: "#5a6b82" }}>Sin alertas</div>
              ) : (
                <>
                  {alerts.filter(a => !dismissedAlerts.has(a.id)).map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        padding: "10px 16px",
                        borderBottom: "1px solid rgba(56, 189, 248, 0.04)",
                        fontSize: 12,
                        color: "#8899b0",
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(56, 189, 248, 0.04)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: alert.color,
                          flexShrink: 0,
                          marginTop: 4,
                        }}
                      />
                      <div style={{ flex: 1 }}>{alert.message}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDismissedAlerts(prev => new Set([...prev, alert.id]));
                        }}
                        style={{
                          background: "none", border: "none", color: "#3d4f63",
                          cursor: "pointer", padding: 2, borderRadius: 4, flexShrink: 0,
                          lineHeight: 1,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#8899b0"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#3d4f63"; }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      style={{
                        padding: "10px 16px",
                        borderBottom: "1px solid rgba(192, 132, 252, 0.04)",
                        fontSize: 12,
                        color: "#c084fc",
                        display: "flex",
                        gap: 10,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(192, 132, 252, 0.04)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#c084fc",
                          flexShrink: 0,
                          marginTop: 4,
                        }}
                      />
                      <div>{notification.message}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {session?.user && (
          <Link
            href="/profile"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(212, 165, 116, 0.15))",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#38bdf8",
              boxShadow: "0 0 12px rgba(56, 189, 248, 0.1)",
              cursor: "pointer",
              transition: "all 0.2s",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(212, 165, 116, 0.25))";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(56, 189, 248, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(212, 165, 116, 0.15))";
              e.currentTarget.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.1)";
            }}
          >
            {session.user.name?.charAt(0) || "U"}
          </Link>
        )}
      </div>
    </div>
  );
}
