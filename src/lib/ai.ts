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

// ============================================================================
// Lectura de la respuesta
// ============================================================================

interface AnthropicBlock {
  type?: string;
  text?: string;
}

/**
 * Junta TODO el texto de la respuesta.
 * No asume que content[0] sea el texto: si algun dia se activa el modo
 * "thinking", el primer bloque es de razonamiento y el texto viene despues.
 */
export function textoDeRespuesta(result: { content?: AnthropicBlock[] }): string {
  const blocks = Array.isArray(result?.content) ? result.content : [];
  return blocks
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("")
    .trim();
}

/**
 * Extrae el primer objeto JSON completo de la respuesta del modelo.
 *
 * Tolera lo que los modelos suelen agregar aunque se les pida que no:
 * cercas de markdown (```json), una frase de introduccion antes del objeto
 * y texto suelto despues. Recorre las llaves contando anidamiento y
 * respetando comillas y escapes, asi no se corta en la primera "}" que
 * aparezca dentro de un string.
 *
 * Devuelve null si no hay un objeto JSON valido.
 */
export function extraerJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;

  // Sacar cercas de markdown por si vinieron.
  let s = raw.replace(/```json/gi, "```").trim();
  if (s.includes("```")) {
    const partes = s.split("```");
    // El bloque cercado suele ser el segundo pedazo.
    const candidato = partes.find((p) => p.trim().startsWith("{"));
    if (candidato) s = candidato.trim();
  }

  const inicio = s.indexOf("{");
  if (inicio === -1) return null;

  let nivel = 0;
  let enString = false;
  let escapado = false;

  for (let i = inicio; i < s.length; i++) {
    const c = s[i];

    if (escapado) {
      escapado = false;
      continue;
    }
    if (c === "\\") {
      if (enString) escapado = true;
      continue;
    }
    if (c === '"') {
      enString = !enString;
      continue;
    }
    if (enString) continue;

    if (c === "{") nivel++;
    else if (c === "}") {
      nivel--;
      if (nivel === 0) {
        try {
          return JSON.parse(s.slice(inicio, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }

  // Llaves sin cerrar: respuesta cortada.
  return null;
}

/** Recorte del texto crudo para poder diagnosticar sin llenar la pantalla. */
export function vistaPrevia(raw: string, max = 300): string {
  const s = (raw || "").replace(/\s+/g, " ").trim();
  if (!s) return "(respuesta vacía)";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/**
 * Mensaje de error cuando el modelo respondio pero no pudimos leer el JSON.
 * Incluye el motivo real para no mandar a buscar el problema al lugar equivocado.
 */
export function errorDeLectura(raw: string, stopReason?: string | null): string {
  if (stopReason === "max_tokens") {
    return "La respuesta de la IA se cortó por ser demasiado larga. Probá describiendo el presupuesto de forma más breve.";
  }
  if (!raw) {
    return "La IA devolvió una respuesta vacía. Probá de nuevo en unos segundos.";
  }
  return `No pude interpretar la respuesta de la IA. Devolvió: ${vistaPrevia(raw, 200)}`;
}
