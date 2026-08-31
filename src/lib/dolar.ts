/**
 * Cotizacion del dolar blue del lado del servidor.
 *
 * Se usa como red de seguridad al guardar: ningun costo ni cotizacion debe
 * quedar sin tipo de cambio. Sin ese dato el registro queda invisible para todo
 * lo que la app mide en pesos (aparece como "sin tipo de cambio — no suma en
 * ARS") y no hay forma de reconstruirlo despues sin adivinar.
 */

interface Blue {
  compra: number;
  venta: number;
  promedio: number;
}

let cache: { valor: Blue; vence: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

async function pedir(url: string, leer: (d: unknown) => Blue | null): Promise<Blue | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return leer(await res.json());
  } catch {
    return null;
  }
}

/** Promedio del blue de hoy, o null si ninguna fuente responde. */
export async function getBlueRate(): Promise<Blue | null> {
  if (cache && cache.vence > Date.now()) return cache.valor;

  const armar = (compra: number, venta: number): Blue | null =>
    compra > 0 && venta > 0
      ? { compra, venta, promedio: Math.round((compra + venta) / 2) }
      : null;

  const blue =
    (await pedir("https://dolarapi.com/v1/dolares/blue", (d) => {
      const x = d as { compra?: number; venta?: number };
      return armar(x.compra ?? 0, x.venta ?? 0);
    })) ??
    (await pedir("https://api.bluelytics.com.ar/v2/latest", (d) => {
      const x = d as { blue?: { value_buy?: number; value_sell?: number } };
      return armar(x.blue?.value_buy ?? 0, x.blue?.value_sell ?? 0);
    }));

  if (blue) cache = { valor: blue, vence: Date.now() + TTL_MS };
  return blue;
}

/**
 * Completa el TC cuando el cliente no lo mando. Devuelve el que ya venia si es
 * valido; si no, el blue de hoy; si tampoco hay, null (no inventamos un numero).
 */
export async function resolverTipoDeCambio(
  recibido: number | null | undefined
): Promise<number | null> {
  if (recibido && recibido > 0) return recibido;
  const blue = await getBlueRate();
  return blue?.promedio ?? null;
}
