/**
 * Configuración central de las llamadas a la API de Anthropic.
 *
 * El model ID vive acá y en ningún otro lado: los modelos se retiran con el
 * tiempo (claude-sonnet-4-20250514 se retiró el 15/06/2026 y dejó el análisis
 * de presupuestos, el lector de comprobantes y el recomendador fallando en
 * silencio), así que actualizarlo tiene que ser cambiar una sola línea.
 *
 * Ojo: los IDs son snapshots fijos, no punteros que se actualizan solos.
 * Conviene revisar la lista de modelos vigentes cada tanto.
 *
 * Estado de los modelos: https://docs.claude.com/en/docs/about-claude/model-deprecations
 */
export const AI_MODEL = "claude-sonnet-5";

export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export function anthropicHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
}

/**
 * Traduce una respuesta fallida de Anthropic a un mensaje que se entienda,
 * en vez de asumir siempre que el problema es la API key.
 * Nunca incluye la key en el texto devuelto.
 */
export function describeAnthropicError(status: number, body: string): string {
  let apiMessage = "";
  try {
    const parsed = JSON.parse(body);
    apiMessage = parsed?.error?.message || "";
  } catch {
    apiMessage = "";
  }

  if (status === 401 || status === 403) {
    return "La API key de Anthropic es inválida o no tiene permisos. Revisá ANTHROPIC_API_KEY.";
  }
  if (status === 404) {
    return `El modelo "${AI_MODEL}" no está disponible. Puede haber sido retirado: revisá la lista de modelos vigentes y actualizá AI_MODEL en src/lib/ai.ts.`;
  }
  if (status === 429) {
    return "Demasiadas consultas seguidas a la IA. Esperá unos segundos y probá de nuevo.";
  }
  if (status === 400 && /credit|balance|quota/i.test(apiMessage)) {
    return "La cuenta de Anthropic no tiene crédito disponible.";
  }
  if (status >= 500) {
    return "La API de Anthropic está con problemas en este momento. Probá de nuevo en un rato.";
  }
  return `Error ${status} de la API de Anthropic${apiMessage ? `: ${apiMessage}` : ""}.`;
}
