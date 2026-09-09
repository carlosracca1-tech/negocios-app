"use client";

/**
 * Pantalla "olvide mi contrasena": pide el email y dispara el mail con el link.
 *
 * El mensaje de exito es el mismo exista o no la cuenta, igual que la respuesta
 * del endpoint: si dijera "ese email no existe", cualquiera podria averiguar
 * quien esta registrado probando direcciones.
 */

import { useState, FormEvent } from "react";
import Link from "next/link";
import styles from "../login/login.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMensaje("");
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo enviar el mail");
      } else {
        setMensaje(data.message);
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Recuperar acceso</h1>
        <p className={styles.subtitle}>Te mandamos un link para elegir una contraseña nueva</p>

        {error && <div className={styles.error}>{error}</div>}
        {mensaje && <div className={styles.success}>{mensaje}</div>}

        {!mensaje && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email de tu cuenta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
                placeholder="tu@email.com"
              />
            </div>

            <button type="submit" disabled={enviando} className={styles.button}>
              {enviando ? "Enviando..." : "Enviarme el link"}
            </button>
          </form>
        )}

        <div className={styles.linkRow}>
          <Link href="/login" className={styles.link}>
            Volver al ingreso
          </Link>
        </div>
      </div>
    </div>
  );
}
