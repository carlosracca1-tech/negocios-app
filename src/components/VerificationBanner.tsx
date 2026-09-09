"use client";

/**
 * Cartel fijo arriba de todo para las cuentas que todavia no confirmaron su
 * email. No bloquea nada: solo pide que verifiquen, y permite reenviar el mail
 * desde ahi mismo.
 *
 * Aparece unicamente si hay sesion iniciada y el email no esta verificado.
 */

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function VerificationBanner() {
  const { status } = useSession();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelado = false;

    fetch("/api/auth/estado")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelado || !data) return;
        setEmail(data.email || "");
        setVisible(!data.emailVerificado);
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
  }, [status]);

  if (!visible) return null;

  const reenviar = async () => {
    setEnviando(true);
    setAviso("");
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setAviso(data.message || "Listo, revisá tu casilla.");
    } catch {
      setAviso("No se pudo enviar. Probá de nuevo en un rato.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      role="status"
      style={{
        background: "var(--warning-soft, rgba(245, 158, 11, 0.14))",
        borderBottom: "1px solid var(--warning-border, rgba(245, 158, 11, 0.35))",
        color: "var(--text-primary)",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        flexWrap: "wrap",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <span>
        <strong style={{ color: "var(--warning, #f59e0b)" }}>Falta verificar tu email.</strong>{" "}
        {aviso
          ? aviso
          : `Confirmá ${email || "tu dirección"} para poder recuperar la cuenta si olvidás la contraseña.`}
      </span>

      {!aviso && (
        <button
          type="button"
          onClick={reenviar}
          disabled={enviando}
          style={{
            background: "transparent",
            border: "1px solid var(--warning-border, rgba(245, 158, 11, 0.5))",
            color: "var(--warning, #f59e0b)",
            padding: "5px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: enviando ? "wait" : "pointer",
          }}
        >
          {enviando ? "Enviando..." : "Enviarme el mail"}
        </button>
      )}

      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Cerrar aviso"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--text-tertiary)",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          padding: 4,
        }}
      >
        ×
      </button>
    </div>
  );
}
