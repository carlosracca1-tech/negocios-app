"use client";

/**
 * Pantalla a la que lleva el link del mail de confirmacion. Consume el token
 * apenas carga y muestra el resultado.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../login/login.module.css";

type Estado = "verificando" | "ok" | "error";

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [estado, setEstado] = useState<Estado>("verificando");
  const [mensaje, setMensaje] = useState("");

  // Un solo intento: en desarrollo React monta dos veces y el token se
  // consume en el primer POST, asi que el segundo daria "link ya usado".
  const yaVerifico = useRef(false);

  const verificar = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        setEstado("ok");
        setMensaje(data.message);
      } else {
        setEstado("error");
        setMensaje(data.error || "No se pudo verificar el email");
      }
    } catch {
      setEstado("error");
      setMensaje("No se pudo conectar con el servidor");
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setEstado("error");
      setMensaje("Este link no tiene código de verificación.");
      return;
    }
    if (yaVerifico.current) return;
    yaVerifico.current = true;
    verificar();
  }, [token, verificar]);

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>
        {estado === "verificando" ? "Verificando..." : estado === "ok" ? "Email confirmado" : "No se pudo verificar"}
      </h1>

      {estado === "verificando" && (
        <p className={styles.centerText}>Un segundo, estamos confirmando tu dirección.</p>
      )}
      {estado === "ok" && <div className={styles.success}>{mensaje}</div>}
      {estado === "error" && <div className={styles.error}>{mensaje}</div>}

      {estado !== "verificando" && (
        <div className={styles.linkRow}>
          <Link href="/login" className={styles.link}>
            Ir al ingreso
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<div className={styles.card}><p className={styles.centerText}>Cargando...</p></div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
