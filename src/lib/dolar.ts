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

/** Último TC conocido: se guarda incluso después de que el cache expire,
 *  para tener un fallback cuando las dos APIs están caídas. */
let ultimoConocido: Blue | null = null;

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

  if (blue) {
    cache = { valor: blue, vence: Date.now() + TTL_MS };
    ultimoConocido = blue;
    return blue;
  }

  // Ambas APIs fallaron: devolver el último valor conocido en vez de null.
  // Es mejor un TC de hace unos minutos que no tener TC y guardar el costo
  // sin conversión (quedaría invisible en todos los reportes en USD).
  if (ultimoConocido) {
    console.warn("dolar.ts: APIs caídas, usando último TC conocido:", ultimoConocido.promedio);
    return ultimoConocido;
  }

  return null;
}

/**
 * Respaldo desde la base: busca el exchangeRate del costo o gasto más reciente
 * de la cuenta. Se usa cuando las APIs del blue están caídas y no hay nada en
 * memoria (pasa seguido en Vercel por cold starts).
 * Devuelve { promedio, fecha } o null.
 */
export async function getRespaldoFromDb(organizationId: string): Promise<{ promedio: number; fecha: Date } | null> {
  try {
    // Importación dinámica para no crear dependencia circular
    const { prisma } = await import("./prisma");

    // Buscar el costo más reciente con exchangeRate
    const cost = await prisma.cost.findFirst({
      where: {
        project: { organizationId },
        exchangeRate: { not: null, gt: 0 },
      },
      orderBy: { date: "desc" },
      select: { exchangeRate: true, date: true },
    });

    if (cost?.exchangeRate) {
      return { promedio: cost.exchangeRate, fecha: cost.date };
    }

    // Si no hay costos, buscar en gastos
    const expense = await prisma.expense.findFirst({
      where: {
        project: { organizationId },
        exchangeRate: { not: null, gt: 0 },
      },
      orderBy: { period: "desc" },
      select: { exchangeRate: true, period: true },
    });

    if (expense?.exchangeRate) {
      return { promedio: expense.exchangeRate, fecha: expense.period };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Completa el TC cuando el cliente no lo mando. Devuelve el que ya venia si es
 * valido; si no, el blue de hoy; si tampoco hay, busca el último TC de la cuenta
 * en la base; si tampoco hay, null.
 */
export async function resolverTipoDeCambio(
  recibido: number | null | undefined,
  organizationId?: string
): Promise<number | null> {
  if (recibido && recibido > 0) return recibido;
  const blue = await getBlueRate();
  if (blue?.promedio) return blue.promedio;
  // Respaldo desde la base
  if (organizationId) {
    const respaldo = await getRespaldoFromDb(organizationId);
    if (respaldo) {
      console.warn(`dolar.ts: usando TC de respaldo de la base (${respaldo.promedio}, del ${respaldo.fecha.toISOString().split("T")[0]})`);
      return respaldo.promedio;
    }
  }
  return null;
}
