/**
 * In-memory rate limiter for login attempts.
 *
 * LIMITACION: Este rate limit es en memoria y se resetea al reiniciar
 * el servidor o en cada cold start de serverless (Vercel).
 * Es una mitigacion temporal, NO una solucion robusta.
 * Para produccion seria se recomienda Redis (Upstash) o similar.
 */

const attempts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 10;

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

// Cleanup entries viejas cada 30 min para evitar memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) {
      if (now > entry.resetAt) attempts.delete(key);
    }
  }, 30 * 60 * 1000);
}
