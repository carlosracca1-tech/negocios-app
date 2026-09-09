"use client";

/**
 * Pantalla donde se elige la contrasena nueva. Llega con ?token=... desde el
 * mail; el token se valida en el servidor al confirmar.
 */

import { Suspense, useState, FormEvent } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "../login/login.module.css";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password !== repetir) {
      setError("Las dos contraseñas no coinciden");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cambiar la contraseña");
      } else {
        setListo(true);
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setEnviando(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Link inválido</h1>
        <p className={styles.centerText}>
          Este link no tiene el código de recuperación. Pedí uno nuevo.
        </p>
        <div className={styles.linkRow}>
          <Link href="/forgot-password" className={styles.link}>
            Pedir un link nuevo
          </Link>
        </div>
      </div>
    );
  }

  if (listo) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Listo</h1>
        <div className={styles.success}>
          Tu contraseña quedó cambiada. Te llevamos al ingreso...
        </div>
        <div className={styles.linkRow}>
          <Link href="/login" className={styles.link}>
            Ir ahora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Nueva contraseña</h1>
      <p className={styles.subtitle}>Elegí una de al menos 8 caracteres</p>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>
            Contraseña nueva
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className={styles.input}
            placeholder="••••••••"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="repetir" className={styles.label}>
            Repetila
          </label>
          <input
            id="repetir"
            type="password"
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
            required
            minLength={8}
            className={styles.input}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={enviando} className={styles.button}>
          {enviando ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<div className={styles.card}><p className={styles.centerText}>Cargando...</p></div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
