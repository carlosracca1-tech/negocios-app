"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import ProjectCard from "@/components/ProjectCard";
import AddProjectModal from "@/components/AddProjectModal";
import { useProjects } from "@/hooks/useProjects";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const { projects, loading, refetch } = useProjects();

  if (status === "loading") {
    return <div>Cargando...</div>;
  }

  if (!session) {
    redirect("/login");
  }

  // Filter projects
  let filtered = [...projects];
  if (typeFilter !== "Todos") filtered = filtered.filter((p) => p.type === typeFilter);
  if (statusFilter !== "Todos") filtered = filtered.filter((p) => p.status === statusFilter.toLowerCase());
  if (searchQuery) filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Sort: activos first, then pausados, then vendidos
  const order: Record<string, number> = { activo: 0, pausado: 1, vendido: 2 };
  filtered.sort((a, b) => (order[a.status] || 0) - (order[b.status] || 0));

  return (
    <main style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <Header />

      <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "#fff", borderRadius: 8, border: "1px solid #e0e0e0", overflow: "hidden" }}>
            {["Todos", "Casa", "Auto"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: "7px 18px",
                  fontSize: 13,
                  fontWeight: typeFilter === t ? 600 : 400,
                  background: typeFilter === t ? "#1B3A5C" : "transparent",
                  color: typeFilter === t ? "#fff" : "#555",
                  border: "none",
                  cursor: "pointer",
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
              padding: "7px 12px",
              fontSize: 13,
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              background: "#fff",
              color: "#555",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="Todos">Estado: Todos</option>
            <option value="Activo">Activo</option>
            <option value="Vendido">Vendido</option>
            <option value="Pausado">Pausado</option>
          </select>

          <div style={{ flex: 1 }} />

          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            style={{
              padding: "7px 14px",
              fontSize: 13,
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              outline: "none",
              width: 200,
              background: "#fff",
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
                color: "#2E75B6",
                background: "#EBF1F8",
                border: "1px solid #c5d9f0",
                borderRadius: 8,
                padding: "5px 12px",
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
          <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
            Cargando proyectos...
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {/* Add new project card */}
            <div
              onClick={() => setShowAddModal(true)}
              style={{
                background: "#fff",
                borderRadius: 12,
                border: "2px dashed #ddd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 400,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#1B3A5C";
                e.currentTarget.style.background = "#F0F4F8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#ddd";
                e.currentTarget.style.background = "#fff";
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>+</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1B3A5C" }}>Nuevo proyecto</div>
              </div>
            </div>

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
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              No se encontraron proyectos
            </div>
            <div style={{ fontSize: 14, marginBottom: 20 }}>
              Intenta cambiar los filtros o crea un nuevo proyecto
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: "#1B3A5C",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              + Crear proyecto
            </button>
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
