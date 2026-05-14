"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

import styles from "./login.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push("/");
      }
    } catch (err) {
      setError("Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <svg
            width="84"
            height="70"
            viewBox="0 0 120 100"
            fill="none"
            aria-label="N$"
            role="img"
            style={{ filter: "drop-shadow(0 0 24px var(--accent-glow))" }}
          >
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
        </div>
        <h1 className={styles.title}>N$ — Seguimiento</h1>
        <p className={styles.subtitle}>Sistema de gestión de inversiones</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
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

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={styles.button}
          >
            {isLoading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className={styles.hint}>
          <p>Contacta al administrador para obtener una cuenta</p>
        </div>
      </div>
    </div>
  );
}
