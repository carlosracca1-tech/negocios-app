/**
 * Corrige la moneda / el monto / el tipo de cambio de un costo mal cargado.
 *
 * Caso tipico: un gasto que en realidad fue en pesos quedo guardado como USD y
 * sin tipo de cambio, asi que no suma en ARS y aparece el aviso "sin tipo de
 * cambio". Este script lo reescribe con los valores reales y le pone el blue
 * promedio del dia de la fecha del costo.
 *
 * Uso:
 *   npm run reparar:costo -- --buscar "Aire acondicionado" --moneda ARS --monto 9500000
 *   npm run reparar:costo -- --id <costId> --moneda ARS --monto 9500000 --apply
 *
 * Sin --apply solo muestra que haria. Si --buscar matchea mas de un costo, no
 * toca nada: hay que desambiguar con --id.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(nombre: string): string | null {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const APPLY = process.argv.includes("--apply");
const ID = arg("id");
const BUSCAR = arg("buscar");
const MONEDA = (arg("moneda") || "").toUpperCase();
const MONTO = arg("monto") ? Number(arg("monto")) : null;
const TC_MANUAL = arg("tc") ? Number(arg("tc")) : null;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Blue promedio de esa fecha, o del ultimo dia habil anterior. */
async function blueDe(fecha: Date): Promise<{ rate: number; fechaUsada: string } | null> {
  const res = await fetch("https://api.argentinadatos.com/v1/cotizaciones/dolares/blue");
  if (!res.ok) return null;
  const data = (await res.json()) as { fecha: string; compra: number; venta: number }[];
  const serie = new Map<string, number>();
  data.forEach((d) => {
    if (d.fecha && d.compra > 0 && d.venta > 0) serie.set(d.fecha.slice(0, 10), (d.compra + d.venta) / 2);
  });
  const d = new Date(fecha);
  for (let i = 0; i < 10; i++) {
    const key = ymd(d);
    const r = serie.get(key);
    if (r && r > 0) return { rate: Math.round(r), fechaUsada: key };
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return null;
}

async function main() {
  if (!ID && !BUSCAR) {
    console.error("Falta --id <costId> o --buscar <texto del concepto>.");
    process.exit(1);
  }
  if (MONEDA && MONEDA !== "ARS" && MONEDA !== "USD") {
    console.error('--moneda tiene que ser ARS o USD.');
    process.exit(1);
  }

  const costos = await prisma.cost.findMany({
    where: ID
      ? { id: ID }
      : { concept: { contains: BUSCAR as string, mode: "insensitive" } },
    include: { partida: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  if (costos.length === 0) {
    console.log("No encontre ningun costo con ese criterio.");
    return;
  }

  console.log(`Encontrados: ${costos.length}\n`);
  costos.forEach((c) => {
    console.log(`  id=${c.id}`);
    console.log(`  ${ymd(c.date)} · ${c.concept}`);
    console.log(`  ahora: ${c.currency} ${c.amount} · TC ${c.exchangeRate ?? "—"} · USD ${c.amountUsd ?? "—"}`);
    console.log(`  presupuesto: ${c.partida?.name ?? "sin imputar"}\n`);
  });

  if (costos.length > 1) {
    console.log("Hay mas de uno: volve a correrlo con --id <costId> para elegir cual.");
    return;
  }

  const c = costos[0];
  const moneda = (MONEDA || c.currency) as "ARS" | "USD";
  const monto = MONTO ?? c.amount;

  let tc = TC_MANUAL;
  if (!tc || tc <= 0) {
    const blue = await blueDe(c.date);
    if (!blue) {
      console.error("No pude obtener el blue de esa fecha. Pasalo a mano con --tc <valor>.");
      process.exit(1);
    }
    tc = blue.rate;
    console.log(`TC del blue para ${ymd(c.date)}: ${tc} (cotizacion del ${blue.fechaUsada})`);
  }

  const amountUsd = moneda === "ARS" ? monto / tc : monto;

  console.log(`\nqueda: ${moneda} ${monto.toLocaleString("es-AR")} · TC ${tc} · USD ${amountUsd.toFixed(2)}`);

  if (!APPLY) {
    console.log("\nNada se escribio. Volve a correrlo con --apply.");
    return;
  }

  await prisma.cost.update({
    where: { id: c.id },
    data: { currency: moneda, amount: monto, exchangeRate: tc, amountUsd },
  });
  console.log("\nListo, costo corregido.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
