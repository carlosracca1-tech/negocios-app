"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import ProjectCard from "@/components/ProjectCard";
import AddProjectModal from "@/components/AddProjectModal";
import { useSharedProjects } from "@/contexts/ProjectsContext";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const { projects, loading, refetch } = useSharedProjects();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        color: "#5a6b82",
        background: "#060b14",
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid rgba(56, 189, 248, 0.15)",
            borderTopColor: "#38bdf8",
            animation: "spin 1s linear infinite",
          }} />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  let filtered = [...projects];
  if (typeFilter !== "Todos") filtered = filtered.filter((p) => p.type === typeFilter);
  if (statusFilter !== "Todos") filtered = filtered.filter((p) => p.status === statusFilter.toLowerCase());
  if (searchQuery) filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const order: Record<string, number> = { activo: 0, pausado: 1, vendido: 2 };
  filtered.sort((a, b) => (order[a.status] || 0) - (order[b.status] || 0));

  return (
    <main style={{ minHeight: "100vh", background: "#060b14" }}>
      <Header />

      <div className="page-container" style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Filter bar */}
        <div className="filter-bar" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{
            display: "flex",
            background: "rgba(12, 21, 36, 0.6)",
            backdropFilter: "blur(12px)",
            borderRadius: 12,
            border: "1px solid rgba(56, 189, 248, 0.08)",
            overflow: "hidden",
          }}>
            {["Todos", "Casa", "Auto"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: typeFilter === t ? 600 : 400,
                  background: typeFilter === t ? "rgba(56, 189, 248, 0.12)" : "transparent",
                  color: typeFilter === t ? "#7dd3fc" : "#5a6b82",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (typeFilter !== t) e.currentTarget.style.color = "#8899b0";
                }}
                onMouseLeave={(e) => {
                  if (typeFilter !== t) e.currentTarget.style.color = "#5a6b82";
                }}
              >
                {t === "Todos" ? "Todos" : t === "Casa" ? "Casas" : "Autos"}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              border: "1px solid rgba(56, 189, 248, 0.08)",
              borderRadius: 12,
              background: "rgba(12, 21, 36, 0.6)",
              backdropFilter: "blur(12px)",
              color: "#e8edf5",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="Todos">Estado: Todos</option>
            <option value="Activo">Activo</option>
            <option value="Vendido">Vendido</option>
            <option value="Pausado">Pausado</option>
          </select>

          <div className="filter-spacer" style={{ flex: 1 }} />

          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            style={{
              padding: "8px 14px",
              fontSize: 13,
              border: "1px solid rgba(56, 189, 248, 0.08)",
              borderRadius: 12,
              outline: "none",
              width: 200,
              minWidth: 0,
              background: "rgba(12, 21, 36, 0.6)",
              backdropFilter: "blur(12px)",
              color: "#e8edf5",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.3)";
              e.currentTarget.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />

          {(typeFilter !== "Todos" || statusFilter !== "Todos" || searchQuery) && (
            <button
              onClick={() => {
                setTypeFilter("Todos");
                setStatusFilter("Todos");
                setSearchQuery("");
              }}
              style={{
                fontSize: 12,
                color: "#7dd3fc",
                background: "transparent",
                border: "1px solid rgba(56, 189, 248, 0.15)",
                borderRadius: 12,
                padding: "6px 14px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Cards grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#5a6b82" }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "3px solid rgba(56, 189, 248, 0.15)",
              borderTopColor: "#38bdf8",
              animation: "spin 1s linear infinite",
              margin: "0 auto 12px",
            }} />
            Cargando proyectos...
          </div>
        ) : (
          <div className="projects-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {/* Add new project card - only for admin */}
            {session?.user?.role === "admin" && (
              <div
                onClick={() => setShowAddModal(true)}
                style={{
                  background: "rgba(12, 21, 36, 0.4)",
                  backdropFilter: "blur(8px)",
                  borderRadius: 16,
                  border: "2px dashed rgba(56, 189, 248, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 280,
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.35)";
                  e.currentTarget.style.borderStyle = "solid";
                  e.currentTarget.style.background = "rgba(56, 189, 248, 0.04)";
                  e.currentTarget.style.boxShadow = "0 0 30px rgba(56, 189, 248, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.12)";
                  e.currentTarget.style.borderStyle = "dashed";
                  e.currentTarget.style.background = "rgba(12, 21, 36, 0.4)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontSize: 36,
                    marginBottom: 8,
                    background: "linear-gradient(135deg, #38bdf8, #d4a574)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 300,
                  }}>+</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#7dd3fc" }}>Nuevo proyecto</div>
                </div>
              </div>
            )}

            {/* Project cards */}
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => router.push(`/project/${project.id}`)}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#5a6b82" }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#e8edf5" }}>
              No se encontraron proyectos
            </div>
            <div style={{ fontSize: 14, marginBottom: 20 }}>
              Intenta cambiar los filtros {session?.user?.role === "admin" && "o crea un nuevo proyecto"}
            </div>
            {session?.user?.role === "admin" && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  background: "linear-gradient(135deg, #38bdf8, #7dd3fc)",
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#060b14",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(56, 189, 248, 0.25)",
                }}
              >
                + Crear proyecto
              </button>
            )}
          </div>
        )}
      </div>

      <AddProjectModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => refetch()}
      />
    </main>
  );
}
