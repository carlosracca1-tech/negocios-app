/**
 * Re-throw Next.js internal bailout errors.
 *
 * During build, Next.js probes route handlers and throws special errors
 * (e.g. when headers() is called in a static context) as signals to mark
 * routes as dynamic. If a try/catch swallows these, the build logs
 * spurious "Dynamic server usage" errors.
 *
 * The thrown object is a minified cross-realm error (`n [Error]`) that
 * fails both `instanceof Error` and direct `.message` property access.
 * We use `String(error)` which calls `.toString()` — the only reliable
 * way to read the message from any error-like object.
 *
 * Call this at the top of every catch block in API route handlers:
 *
 *   catch (error) {
 *     rethrowNextError(error);
 *     // … handle real application errors below
 *   }
 */
export function rethrowNextError(error: unknown): void {
  if (!error || typeof error !== "object") return;
  // Next.js >=15: bailout errors carry a `digest` property
  if ("digest" in error) throw error;
  // Next.js 14.x: cross-realm minified error — String() is the only
  // reliable way to read the message across realm boundaries
  if (String(error).includes("Dynamic server usage")) throw error;
}
