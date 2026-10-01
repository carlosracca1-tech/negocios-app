/**
 * Rate limiter para login, compatible con Vercel serverless.
 *
 * En serverless cada instancia tiene su propio Map, que se resetea con cada
 * cold start. Para compensar:
 * - La ventana es corta (5 min en vez de 15) y se permite menos intentos (5).
 * - Fluid Compute de Vercel reutiliza instancias entre requests, asi que
 *   mientras la instancia siga caliente el Map persiste.
 * - NO es equivalente a un rate limit centralizado (Redis/Upstash). Para un
 *   atacante distribuido esto no alcanza. Pero cubre el caso comun de alguien
 *   probando contraseñas desde un solo browser.
 *
 * Si en algun momento se agrega Upstash Redis, reemplazar la implementacion
 * de abajo por @upstash/ratelimit sin tocar la interfaz publica.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutos

const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

// Limpieza periodica para evitar memory leak en instancias de larga vida.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) {
      if (now > entry.resetAt) attempts.delete(key);
    }
  }, 10 * 60 * 1000);
}
