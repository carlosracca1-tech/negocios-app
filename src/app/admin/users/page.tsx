"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { usersApi } from "@/lib/api-client";
import { User } from "@/types";

interface Toast {
  id: string;
  type: "success" | "error";
  message: string;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Check authorization and load users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/");
      return;
    }

    if (status === "authenticated") {
      loadUsers();
    }
  }, [status, session, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.list();
      setUsers(data);
    } catch (error) {
      showToast("error", "Error al cargar usuarios");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: "success" | "error", message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "colaborador" | "vista") => {
    const currentUser = users.find((u) => u.id === userId);
    if (!currentUser || currentUser.role === newRole) return;

    // Confirmation
    const roleLabels: Record<string, string> = {
      admin: "Admin",
      colaborador: "Colaborador",
      vista: "Solo Lectura",
    };

    const confirmed = window.confirm(
      `Cambiar rol de "${currentUser.name}" a ${roleLabels[newRole]}?`
    );

    if (!confirmed) return;

    try {
      setUpdatingUserId(userId);
      const updated = await usersApi.updateRole(userId, newRole);

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? updated : u))
      );

      showToast("success", `Rol actualizado a ${roleLabels[newRole]}`);
    } catch (error) {
      showToast("error", "Error al actualizar rol");
      console.error(error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (status === "loading") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          color: "#5a6b82",
          background: "#060b14",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "3px solid rgba(56, 189, 248, 0.15)",
              borderTopColor: "#38bdf8",
              animation: "spin 1s linear infinite",
            }}
          />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "admin") {
    return null;
  }

  // Calculate role counts
  const roleCounts = {
    admin: users.filter((u) => u.role === "admin").length,
    colaborador: users.filter((u) => u.role === "colaborador").length,
    vista: users.filter((u) => u.role === "vista").length,
  };

  return (
    <main style={{ minHeight: "100vh", background: "#060b14" }}>
      <Header />

      <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Back button */}
        <button
          onClick={() => router.push("/")}
          style={{
            marginBottom: 24,
            background: "transparent",
            border: "1px solid rgba(56, 189, 248, 0.15)",
            borderRadius: 12,
            padding: "8px 16px",
            fontSize: 13,
            color: "#7dd3fc",
            cursor: "pointer",
            fontWeight: 500,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(56, 189, 248, 0.1)";
            e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.15)";
          }}
        >
          ← Volver
        </button>

        {/* Title and stats */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e8edf5", marginBottom: 12 }}>
            Gestión de Usuarios
          </h1>

          {/* Role counts */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {[
              { role: "admin", label: "Admins", count: roleCounts.admin, color: "#38bdf8" },
              { role: "colaborador", label: "Colaboradores", count: roleCounts.colaborador, color: "#34d399" },
              { role: "vista", label: "Solo Lectura", count: roleCounts.vista, color: "#5a6b82" },
            ].map((item) => (
              <div
                key={item.role}
                style={{
                  background: "rgba(12, 21, 36, 0.6)",
                  backdropFilter: "blur(12px)",
                  borderRadius: 12,
                  border: "1px solid rgba(56, 189, 248, 0.08)",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: item.color,
                    boxShadow: `0 0 8px ${item.color}80`,
                  }}
                />
                <div>
                  <div style={{ fontSize: 12, color: "#5a6b82", fontWeight: 600 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>
                    {item.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Users table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#5a6b82" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "3px solid rgba(56, 189, 248, 0.15)",
                borderTopColor: "#38bdf8",
                animation: "spin 1s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            Cargando usuarios...
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#5a6b82" }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              No hay usuarios
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "rgba(12, 21, 36, 0.6)",
              backdropFilter: "blur(12px)",
              borderRadius: 16,
              border: "1px solid rgba(56, 189, 248, 0.08)",
              overflow: "hidden",
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 150px 150px",
                gap: 16,
                padding: "16px 20px",
                borderBottom: "1px solid rgba(56, 189, 248, 0.08)",
                background: "rgba(6, 11, 20, 0.4)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8899b0", textTransform: "uppercase" }}>
                Nombre
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8899b0", textTransform: "uppercase" }}>
                Email
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8899b0", textTransform: "uppercase" }}>
                Rol
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8899b0", textTransform: "uppercase" }}>
                Miembro desde
              </div>
            </div>

            {/* Table rows */}
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 150px 150px",
                  gap: 16,
                  padding: "16px 20px",
                  borderBottom: "1px solid rgba(56, 189, 248, 0.04)",
                  alignItems: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(56, 189, 248, 0.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: "#e8edf5" }}>
                  {user.name}
                </div>

                <div style={{ fontSize: 13, color: "#8899b0", wordBreak: "break-all" }}>
                  {user.email}
                </div>

                {/* Role dropdown */}
                <div>
                  <select
                    value={user.role}
                    onChange={(e) =>
                      handleRoleChange(
                        user.id,
                        e.target.value as "admin" | "colaborador" | "vista"
                      )
                    }
                    disabled={updatingUserId === user.id}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: 13,
                      border: "1px solid rgba(56, 189, 248, 0.15)",
                      borderRadius: 8,
                      background: "rgba(12, 21, 36, 0.4)",
                      color: user.role === "admin" ? "#38bdf8" : user.role === "colaborador" ? "#34d399" : "#5a6b82",
                      cursor: updatingUserId === user.id ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      opacity: updatingUserId === user.id ? 0.6 : 1,
                      transition: "all 0.2s",
                    }}
                    onFocus={(e) => {
                      if (updatingUserId !== user.id) {
                        e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)";
                        e.currentTarget.style.boxShadow = "0 0 8px rgba(56, 189, 248, 0.1)";
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.15)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value="vista">Solo Lectura</option>
                    <option value="colaborador">Colaborador</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Member since */}
                <div style={{ fontSize: 13, color: "#5a6b82" }}>
                  {new Date(user.createdAt).toLocaleDateString("es-AR", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toasts */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          zIndex: 1000,
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background:
                toast.type === "success"
                  ? "rgba(52, 211, 153, 0.1)"
                  : "rgba(248, 113, 113, 0.1)",
              border:
                toast.type === "success"
                  ? "1px solid rgba(52, 211, 153, 0.3)"
                  : "1px solid rgba(248, 113, 113, 0.3)",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 13,
              color:
                toast.type === "success"
                  ? "#34d399"
                  : "#f87171",
              fontWeight: 600,
              backdropFilter: "blur(12px)",
              boxShadow:
                toast.type === "success"
                  ? "0 0 12px rgba(52, 211, 153, 0.1)"
                  : "0 0 12px rgba(248, 113, 113, 0.1)",
              animation: "slideIn 0.3s ease",
            }}
          >
            {toast.type === "success" ? "✓" : "!"} {toast.message}
          </div>
        ))}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </main>
  );
}
