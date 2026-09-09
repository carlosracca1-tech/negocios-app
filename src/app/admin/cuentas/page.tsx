"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { cuentasApi, Cuenta } from "@/lib/api-client";

interface Toast {
  id: string;
  type: "success" | "error";
  message: string;
}

const card: React.CSSProperties = {
  background: "var(--surface-1)",
  backdropFilter: "blur(12px)",
  borderRadius: 16,
  border: "1px solid var(--border-default)",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border-default)",
  background: "var(--surface-2)",
  color: "var(--text-primary)",
  fontSize: 14,
  outline: "none",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  marginBottom: 6,
};

export default function AdminCuentasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({
    nombreCuenta: "",
    nombreAdmin: "",
    email: "",
    password: "",
  });

  const showToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setCuentas(await cuentasApi.list());
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Error al cargar las cuentas");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && !session?.user?.isSuperAdmin) {
      router.push("/");
      return;
    }
    if (status === "authenticated") cargar();
  }, [status, session, router, cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creando) return;

    try {
      setCreando(true);
      const nueva = await cuentasApi.create(form);
      setCuentas((prev) => [...prev, nueva]);
      showToast(
        "success",
        `Cuenta "${nueva.name}" creada. Ya puede entrar con ${form.email}.`
      );
      setForm({ nombreCuenta: "", nombreAdmin: "", email: "", password: "" });
      cargar();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Error al crear la cuenta");
    } finally {
      setCreando(false);
    }
  };

  if (status === "loading") {
    return (
      <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Header />
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-tertiary)" }}>
          Cargando...
        </div>
      </main>
    );
  }

  if (status === "unauthenticated" || !session?.user?.isSuperAdmin) return null;

  const formCompleto =
    form.nombreCuenta.trim() &&
    form.nombreAdmin.trim() &&
    form.email.trim() &&
    form.password.length >= 8;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Header />

      <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
        <button
          onClick={() => router.push("/")}
          style={{
            marginBottom: 24,
            background: "transparent",
            border: "1px solid var(--border-default)",
            borderRadius: 12,
            padding: "8px 16px",
            fontSize: 13,
            color: "var(--text-primary)",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          ← Volver
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
          Cuentas del sistema
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 32, maxWidth: 640 }}>
          Cada cuenta es un mundo aparte: sus proyectos y sus usuarios. Ni vos ni nadie
          ve los datos de otra cuenta desde acá — solo el nombre y cuánto tiene cargado.
        </p>

        {/* Alta de cuenta */}
        <form onSubmit={crear} style={{ ...card, padding: 24, marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Crear una cuenta nueva
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>
            Arranca vacía. El administrador entra con el email y la contraseña que pongas
            acá, y desde adentro carga sus proyectos y suma a su gente.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <label style={label}>Nombre de la cuenta</label>
              <input
                style={input}
                placeholder="Ej: Estudio Pérez"
                value={form.nombreCuenta}
                onChange={(e) => setForm({ ...form, nombreCuenta: e.target.value })}
              />
            </div>
            <div>
              <label style={label}>Nombre del administrador</label>
              <input
                style={input}
                placeholder="Ej: Juan Pérez"
                value={form.nombreAdmin}
                onChange={(e) => setForm({ ...form, nombreAdmin: e.target.value })}
              />
            </div>
            <div>
              <label style={label}>Email</label>
              <input
                style={input}
                type="email"
                autoComplete="off"
                placeholder="juan@ejemplo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label style={label}>Contraseña inicial (mínimo 8)</label>
              <input
                style={input}
                type="text"
                autoComplete="off"
                placeholder="La que le vas a pasar"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!formCompleto || creando}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid var(--border-strong)",
              background: formCompleto && !creando ? "var(--text-primary)" : "var(--surface-2)",
              color: formCompleto && !creando ? "var(--bg)" : "var(--text-tertiary)",
              fontSize: 14,
              fontWeight: 600,
              cursor: formCompleto && !creando ? "pointer" : "not-allowed",
            }}
          >
            {creando ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        {/* Listado */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-tertiary)" }}>
            Cargando cuentas...
          </div>
        ) : (
          <div style={{ ...card, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.4fr 110px 110px",
                gap: 16,
                padding: "14px 20px",
                borderBottom: "1px solid var(--border-default)",
              }}
            >
              {["Cuenta", "Administrador", "Usuarios", "Proyectos"].map((h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {h}
                </div>
              ))}
            </div>

            {cuentas.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.4fr 110px 110px",
                  gap: 16,
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border-default)",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  {c.name}
                  {c.esLaMia && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--success)",
                        border: "1px solid var(--success)",
                        borderRadius: 6,
                        padding: "1px 6px",
                      }}
                    >
                      la tuya
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                  {c.admins.length
                    ? c.admins.map((a) => `${a.name} (${a.email})`).join(", ")
                    : "— sin admin —"}
                </div>
                <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{c.cantidadUsuarios}</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{c.cantidadProyectos}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 24, right: 24, display: "grid", gap: 8, zIndex: 100 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              ...card,
              padding: "12px 16px",
              maxWidth: 380,
              fontSize: 13,
              color: t.type === "success" ? "var(--success)" : "var(--danger)",
              borderColor: t.type === "success" ? "var(--success)" : "var(--danger)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </main>
  );
}
