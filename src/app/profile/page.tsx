"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: "admin" | "colaborador" | "vista";
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUser();
    }
  }, [status]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Failed to fetch user");
      const { data } = await res.json();
      setUser(data);
      setEditName(data.name);
      setEditEmail(data.email);
    } catch (err) {
      setError("Error al cargar el perfil");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!editName.trim()) {
      setError("El nombre es requerido");
      return;
    }

    if (!editEmail.trim()) {
      setError("El email es requerido");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al guardar cambios");
        return;
      }

      setUser(data.data);
      setSuccess("Perfil actualizado correctamente");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Error al guardar cambios");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword.trim()) {
      setError("Ingresá tu contraseña actual");
      return;
    }

    if (!newPassword.trim()) {
      setError("Ingresá una nueva contraseña");
      return;
    }

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al cambiar contraseña");
        return;
      }

      setSuccess("Contraseña actualizada correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Error al cambiar contraseña");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    const baseStyle = {
      display: "inline-block",
      padding: "6px 14px",
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 600,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    };

    if (role === "admin") {
      return {
        ...baseStyle,
        background: "rgba(56, 189, 248, 0.15)",
        color: "#38bdf8",
        border: "1px solid rgba(56, 189, 248, 0.3)",
      };
    } else if (role === "colaborador") {
      return {
        ...baseStyle,
        background: "rgba(52, 211, 153, 0.15)",
        color: "#34d399",
        border: "1px solid rgba(52, 211, 153, 0.3)",
      };
    } else {
      return {
        ...baseStyle,
        background: "rgba(90, 107, 130, 0.15)",
        color: "#8899b0",
        border: "1px solid rgba(90, 107, 130, 0.3)",
      };
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === "admin") return "Administrador";
    if (role === "colaborador") return "Colaborador";
    return "Solo Vista";
  };

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#060b14" }}>
        <Header />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "calc(100vh - 64px)",
            color: "#5a6b82",
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
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "#060b14" }}>
        <Header />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "calc(100vh - 64px)",
            color: "#f87171",
          }}
        >
          Error al cargar el perfil
        </div>
      </div>
    );
  }

  const createdDate = new Date(user.createdAt).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main style={{ minHeight: "100vh", background: "#060b14" }}>
      <Header />

      <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e8edf5", marginBottom: 8 }}>
            Mi Perfil
          </h1>
          <p style={{ fontSize: 14, color: "#8899b0" }}>
            Administra tu información personal y seguridad
          </p>
        </div>

        {/* User Info Card */}
        <div
          style={{
            background: "rgba(12, 21, 36, 0.6)",
            backdropFilter: "blur(12px)",
            borderRadius: 16,
            border: "1px solid rgba(56, 189, 248, 0.08)",
            padding: 32,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8edf5", marginBottom: 24 }}>
            Información Básica
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            {/* User Avatar */}
            <div>
              <label style={{ fontSize: 12, color: "#8899b0", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, display: "block", marginBottom: 8 }}>
                Avatar
              </label>
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(212, 165, 116, 0.15))",
                  border: "2px solid rgba(56, 189, 248, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                  fontWeight: 700,
                  color: "#38bdf8",
                  boxShadow: "0 0 12px rgba(56, 189, 248, 0.1)",
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Role & Member Since */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: "#8899b0", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Rol
                </label>
                <div style={getRoleBadgeStyle(user.role)}>
                  {getRoleLabel(user.role)}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#8899b0", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Miembro desde
                </label>
                <div style={{ fontSize: 14, color: "#e8edf5" }}>
                  {createdDate}
                </div>
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Name */}
              <div>
                <label style={{ fontSize: 12, color: "#8899b0", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Nombre
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontSize: 14,
                    background: "rgba(12, 21, 36, 0.8)",
                    border: "1px solid rgba(56, 189, 248, 0.08)",
                    borderRadius: 10,
                    color: "#e8edf5",
                    outline: "none",
                    transition: "all 0.2s",
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
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: 12, color: "#8899b0", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontSize: 14,
                    background: "rgba(12, 21, 36, 0.8)",
                    border: "1px solid rgba(56, 189, 248, 0.08)",
                    borderRadius: 10,
                    color: "#e8edf5",
                    outline: "none",
                    transition: "all 0.2s",
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
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div
                style={{
                  padding: "12px 14px",
                  background: "rgba(248, 113, 113, 0.1)",
                  border: "1px solid rgba(248, 113, 113, 0.3)",
                  borderRadius: 10,
                  color: "#f87171",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  padding: "12px 14px",
                  background: "rgba(52, 211, 153, 0.1)",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  borderRadius: 10,
                  color: "#34d399",
                  fontSize: 13,
                }}
              >
                {success}
              </div>
            )}

            {/* Save button */}
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "12px 24px",
                background: saving ? "rgba(56, 189, 248, 0.5)" : "linear-gradient(135deg, #38bdf8, #7dd3fc)",
                border: "none",
                borderRadius: 10,
                color: "#060b14",
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                transition: "all 0.2s",
                boxShadow: "0 4px 16px rgba(56, 189, 248, 0.25)",
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(56, 189, 248, 0.35)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(56, 189, 248, 0.25)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>
        </div>

        {/* Password Change Card */}
        <div
          style={{
            background: "rgba(12, 21, 36, 0.6)",
            backdropFilter: "blur(12px)",
            borderRadius: 16,
            border: "1px solid rgba(56, 189, 248, 0.08)",
            padding: 32,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8edf5" }}>
              Seguridad
            </h2>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  borderRadius: 8,
                  color: "#38bdf8",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)";
                  e.currentTarget.style.background = "rgba(56, 189, 248, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.2)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Cambiar Contraseña
              </button>
            )}
          </div>

          {showPasswordForm && (
            <form onSubmit={handleSavePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Current Password */}
              <div>
                <label style={{ fontSize: 12, color: "#8899b0", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontSize: 14,
                    background: "rgba(12, 21, 36, 0.8)",
                    border: "1px solid rgba(56, 189, 248, 0.08)",
                    borderRadius: 10,
                    color: "#e8edf5",
                    outline: "none",
                    transition: "all 0.2s",
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
              </div>

              {/* New Password */}
              <div>
                <label style={{ fontSize: 12, color: "#8899b0", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontSize: 14,
                    background: "rgba(12, 21, 36, 0.8)",
                    border: "1px solid rgba(56, 189, 248, 0.08)",
                    borderRadius: 10,
                    color: "#e8edf5",
                    outline: "none",
                    transition: "all 0.2s",
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
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ fontSize: 12, color: "#8899b0", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontSize: 14,
                    background: "rgba(12, 21, 36, 0.8)",
                    border: "1px solid rgba(56, 189, 248, 0.08)",
                    borderRadius: 10,
                    color: "#e8edf5",
                    outline: "none",
                    transition: "all 0.2s",
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
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "rgba(248, 113, 113, 0.1)",
                    border: "1px solid rgba(248, 113, 113, 0.3)",
                    borderRadius: 10,
                    color: "#f87171",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "12px 24px",
                    background: saving ? "rgba(56, 189, 248, 0.5)" : "linear-gradient(135deg, #38bdf8, #7dd3fc)",
                    border: "none",
                    borderRadius: 10,
                    color: "#060b14",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    transition: "all 0.2s",
                    boxShadow: "0 4px 16px rgba(56, 189, 248, 0.25)",
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) {
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(56, 189, 248, 0.35)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(56, 189, 248, 0.25)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {saving ? "Actualizando..." : "Actualizar Contraseña"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError("");
                  }}
                  style={{
                    padding: "12px 24px",
                    background: "transparent",
                    border: "1px solid rgba(56, 189, 248, 0.2)",
                    borderRadius: 10,
                    color: "#8899b0",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)";
                    e.currentTarget.style.color = "#e8edf5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.2)";
                    e.currentTarget.style.color = "#8899b0";
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
          {!showPasswordForm && (
            <div style={{ fontSize: 14, color: "#8899b0" }}>
              Actualiza tu contraseña para mantener tu cuenta segura
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
