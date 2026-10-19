"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSharedProjects } from "@/contexts/ProjectsContext";
import { fmtMoney, fmtPct, safeNum } from "@/lib/format";
import { semaforoMargen } from "@/lib/financial";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const { data: session } = useSession();
  const { projects, loading: projectsLoading, alerts } = useSharedProjects();
  const [showAlerts, setShowAlerts] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("negocios-dismissed-alerts");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const alertsRef = useRef<HTMLDivElement>(null);

  // Persistir alertas descartadas en localStorage
  useEffect(() => {
    try {
      localStorage.setItem("negocios-dismissed-alerts", JSON.stringify([...dismissedAlerts]));
    } catch { /* silencioso */ }
  }, [dismissedAlerts]);

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

  const activosProjects = projects.filter((p) => p.status === "activo");
  const vendidosProjects = projects.filter((p) => p.status === "vendido");
  const activos = activosProjects.length;
  const vendidos = vendidosProjects.length;
  const invertido = activosProjects.reduce((sum, p) => sum + safeNum(p.investment), 0);
  const resultado = vendidosProjects.reduce((sum, p) => sum + safeNum(p.result), 0);
  const margenProm = (() => {
    if (vendidosProjects.length === 0) return 0;
    const totalMargin = vendidosProjects.reduce((sum, p) => sum + safeNum(p.margin), 0);
    return totalMargin / vendidosProjects.length;
  })();

  return (
    <div
      className="header-root"
      style={{
        background: "var(--surface-glass)",
        borderBottom: "1px solid var(--border-default)",
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
      <Link
        href="/"
        className="header-logo"
        aria-label="N$ — Inicio"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          whiteSpace: "nowrap",
          marginRight: 32,
          textDecoration: "none",
        }}
      >
        <svg width="32" height="26" viewBox="0 0 120 100" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
          <g stroke="var(--text-primary)" strokeWidth="15" strokeLinecap="square">
            <line x1="20" y1="14" x2="20" y2="86" />
            <line x1="20" y1="14" x2="76" y2="86" />
            <line x1="76" y1="14" x2="76" y2="86" />
          </g>
          <g stroke="var(--warning)" strokeLinecap="round" fill="none">
            <line x1="82" y1="6" x2="82" y2="94" strokeWidth="6" />
            <path
              d="M 104 28 Q 104 18 94 18 L 74 18 Q 64 18 64 28 Q 64 38 74 42 L 94 58 Q 104 62 104 72 Q 104 82 94 82 L 74 82 Q 64 82 64 72"
              strokeWidth="8"
            />
          </g>
        </svg>
        <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
          Seguimiento
        </span>
      </Link>

      {/* KPIs globales (hidden en mobile) */}
      <div className="header-kpis" style={{ display: "flex", gap: 6, flex: "0 1 auto", minWidth: 0, overflow: "hidden" }}>
        {projectsLoading ? (
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Cargando...</div>
        ) : (
          <>
            {[
              { label: "ACTIVOS", value: String(activos), color: "var(--text-primary)" },
              { label: "VENDIDOS", value: String(vendidos), color: "var(--success)" },
              { label: "INVERTIDO", value: fmtMoney(invertido), color: "var(--text-primary)", sublabel: "en activos" },
              { label: "RESULTADO", value: fmtMoney(resultado), color: resultado >= 0 ? "var(--success)" : "var(--danger)", sublabel: "en vendidos" },
              { label: "MARGEN PROM.", value: fmtPct(margenProm), color: semaforoMargen(margenProm) === "verde" ? "var(--success)" : semaforoMargen(margenProm) === "ambar" ? "var(--warning)" : "var(--danger)", sublabel: "en vendidos" },
            ].map((kpi, i) => (
              <div
                key={i}
                title={"sublabel" in kpi && kpi.sublabel ? `${kpi.label} ${kpi.sublabel}` : kpi.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: 10,
                  background: "var(--surface-1)",
                  border: "1px solid var(--border-faint)",
                  transition: "all 0.2s",
                  cursor: "default",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface-2)";
                  e.currentTarget.style.borderColor = "var(--border-default)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--surface-1)";
                  e.currentTarget.style.borderColor = "var(--border-faint)";
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600, lineHeight: 1.1 }}>
                    {kpi.label}
                    {"sublabel" in kpi && kpi.sublabel && (
                      <span className="header-kpi-sub" style={{ fontWeight: 400, opacity: 0.8, marginLeft: 4, textTransform: "lowercase", letterSpacing: 0 }}>{kpi.sublabel}</span>
                    )}
                  </div>
                  <div className="tabular" style={{ fontSize: 15, fontWeight: 700, color: kpi.color, lineHeight: 1.3, whiteSpace: "nowrap" }}>{kpi.value}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ flex: 1 }} className="header-kpis" />

      {/* Right side: theme toggle + alerts + user */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
        <ThemeToggle />

        <div ref={alertsRef} style={{ position: "relative" }}>
          <button
            aria-label="Alertas y notificaciones"
            onClick={() => {
              setShowAlerts(!showAlerts);
              if (!showAlerts && notifications.length > 0) {
                fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({}) })
                  .then(() => setNotifications([]))
                  .catch(() => {});
              }
            }}
            style={{
              background: showAlerts ? "var(--surface-3)" : "var(--surface-2)",
              border: "1px solid var(--border-default)",
              cursor: "pointer",
              position: "relative",
              width: 36,
              height: 36,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {(alerts.filter(a => !dismissedAlerts.has(a.id)).length + notifications.length) > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  background: "var(--danger)",
                  borderRadius: "50%",
                  width: 8,
                  height: 8,
                  boxShadow: "0 0 6px var(--danger)",
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
                background: "var(--surface-solid)",
                border: "1px solid var(--border-strong)",
                borderRadius: 14,
                boxShadow: "var(--shadow-elevated)",
                width: 340,
                maxWidth: "90vw",
                maxHeight: 400,
                overflowY: "auto",
                zIndex: 1000,
                animation: "fadeIn 0.2s ease",
              }}
            >
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-faint)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
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
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      fontWeight: 500,
                      padding: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
                  >
                    Descartar todo
                  </button>
                )}
              </div>
              {alerts.filter(a => !dismissedAlerts.has(a.id)).length === 0 && notifications.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: "var(--text-tertiary)" }}>Sin alertas</div>
              ) : (
                <>
                  {alerts.filter(a => !dismissedAlerts.has(a.id)).map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--border-faint)",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: alert.color, flexShrink: 0, marginTop: 4,
                      }} />
                      <div style={{ flex: 1 }}>{alert.message}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDismissedAlerts(prev => new Set([...prev, alert.id]));
                        }}
                        style={{
                          background: "none", border: "none", color: "var(--text-quaternary)",
                          cursor: "pointer", padding: 2, borderRadius: 4, flexShrink: 0,
                          lineHeight: 1,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-quaternary)"; }}
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
                        borderBottom: "1px solid var(--border-faint)",
                        fontSize: 12,
                        color: "var(--info)",
                        display: "flex",
                        gap: 10,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--info-soft)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: "var(--info)", flexShrink: 0, marginTop: 4,
                      }} />
                      <div>{notification.message}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {session?.user?.isSuperAdmin && (
          <Link
            href="/admin/cuentas"
            title="Cuentas del sistema"
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 10,
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              display: "flex",
              alignItems: "center",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-secondary)",
              textDecoration: "none",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-3)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface-2)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            Cuentas
          </Link>
        )}

        {session?.user && (
          <Link
            href="/profile"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              cursor: "pointer",
              transition: "all 0.2s",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-3)";
              e.currentTarget.style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface-2)";
              e.currentTarget.style.borderColor = "var(--border-default)";
            }}
          >
            {session.user.name?.charAt(0) || "U"}
          </Link>
        )}
      </div>
    </div>
  );
}
