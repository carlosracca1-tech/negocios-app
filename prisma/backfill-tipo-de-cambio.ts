/**
 * Backfill del tipo de cambio historico.
 *
 * Problema: las cotizaciones y los costos cargados en USD se guardaban con
 * exchangeRate = null. Sin esa referencia, todo lo que la app mide en pesos
 * (presupuesto vs real, imputacion de costos) los veia como CERO: por eso un
 * presupuesto en dolares aparecia como "sin monto cargado" y los pagos en
 * dolares no descontaban nada.
 *
 * Este script completa el exchangeRate faltante con el promedio del dolar blue
 * (compra + venta / 2) del dia de cada registro. Si ese dia no cotizo (fin de
 * semana o feriado) usa el ultimo dia habil anterior.
 *
 * Uso:
 *   node --require esbuild-register prisma/backfill-tipo-de-cambio.ts          → simulacion
 *   node --require esbuild-register prisma/backfill-tipo-de-cambio.ts --apply  → escribe
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

type Serie = Map<string, number>; // "YYYY-MM-DD" -> promedio

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Serie historica completa del blue. argentinadatos primero, bluelytics de backup. */
async function cargarSerie(): Promise<Serie> {
  const serie: Serie = new Map();

  try {
    const res = await fetch("https://api.argentinadatos.com/v1/cotizaciones/dolares/blue");
    if (res.ok) {
      const data = (await res.json()) as { fecha: string; compra: number; venta: number }[];
      data.forEach((d) => {
        if (d.fecha && d.compra > 0 && d.venta > 0) {
          serie.set(d.fecha.slice(0, 10), (d.compra + d.venta) / 2);
        }
      });
      if (serie.size > 0) {
        console.log(`Serie del blue: ${serie.size} dias (argentinadatos.com)`);
        return serie;
      }
    }
  } catch {
    console.log("argentinadatos no respondio, probando bluelytics...");
  }

  const res = await fetch("https://api.bluelytics.com.ar/v2/evolution.json");
  if (!res.ok) throw new Error("No se pudo obtener la serie historica del dolar blue");
  const data = (await res.json()) as { date: string; source: string; value_buy: number; value_sell: number }[];
  data
    .filter((d) => d.source === "Blue")
    .forEach((d) => serie.set(d.date.slice(0, 10), (d.value_buy + d.value_sell) / 2));

  console.log(`Serie del blue: ${serie.size} dias (bluelytics.com.ar)`);
  return serie;
}

/** TC de esa fecha, o el del ultimo dia habil anterior (hasta 10 dias atras). */
function tcDe(serie: Serie, fecha: Date): { rate: number; fechaUsada: string } | null {
  const d = new Date(fecha);
  for (let i = 0; i < 10; i++) {
    const key = ymd(d);
    const rate = serie.get(key);
    if (rate && rate > 0) return { rate: Math.round(rate), fechaUsada: key };
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return null;
}

async function main() {
  console.log(APPLY ? "=== APLICANDO CAMBIOS ===\n" : "=== SIMULACION (agrega --apply para escribir) ===\n");
  const serie = await cargarSerie();

  let okCot = 0;
  let okCost = 0;
  const sinDato: string[] = [];

  // ---------- COTIZACIONES (presupuestos) ----------
  const cots = await prisma.cotizacion.findMany({
    where: { OR: [{ exchangeRate: null }, { exchangeRate: { lte: 0 } }] },
    include: { partida: { select: { name: true } } },
  });
  console.log(`\nCotizaciones sin tipo de cambio: ${cots.length}`);

  for (const c of cots) {
    const tc = tcDe(serie, c.createdAt);
    if (!tc) {
      sinDato.push(`cotizacion ${c.id} (${c.provider}) ${ymd(c.createdAt)}`);
      continue;
    }
    const amountUsd = c.currency === "ARS" ? c.amount / tc.rate : c.amount;
    console.log(
      `  ${c.partida.name} · ${c.provider} · ${c.currency} ${c.amount}` +
        ` → TC ${tc.rate} (${tc.fechaUsada})`
    );
    if (APPLY) {
      await prisma.cotizacion.update({
        where: { id: c.id },
        data: { exchangeRate: tc.rate, amountUsd },
      });
    }
    okCot++;
  }

  // ---------- COSTOS ----------
  const costs = await prisma.cost.findMany({
    where: { OR: [{ exchangeRate: null }, { exchangeRate: { lte: 0 } }] },
  });
  console.log(`\nCostos sin tipo de cambio: ${costs.length}`);

  for (const c of costs) {
    const tc = tcDe(serie, c.date);
    if (!tc) {
      sinDato.push(`costo ${c.id} (${c.concept}) ${ymd(c.date)}`);
      continue;
    }
    const amountUsd = c.currency === "ARS" ? c.amount / tc.rate : c.amount;
    console.log(`  ${c.concept} · ${c.currency} ${c.amount} → TC ${tc.rate} (${tc.fechaUsada})`);
    if (APPLY) {
      await prisma.cost.update({
        where: { id: c.id },
        data: { exchangeRate: tc.rate, amountUsd },
      });
    }
    okCost++;
  }

  console.log(`\n--- Resumen ---`);
  console.log(`Cotizaciones actualizadas: ${okCot}`);
  console.log(`Costos actualizados:       ${okCost}`);
  if (sinDato.length > 0) {
    console.log(`\nSin cotizacion del blue para su fecha (${sinDato.length}), quedaron sin tocar:`);
    sinDato.forEach((x) => console.log(`  - ${x}`));
  }
  if (!APPLY) console.log(`\nNada se escribio. Volve a correrlo con --apply.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
