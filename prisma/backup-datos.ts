/**
 * Backup completo de la base a un archivo JSON.
 *
 *   npx tsx prisma/backup-datos.ts
 *
 * Guarda en ./backups/backup-<fecha>.json todas las tablas.
 * Correlo SIEMPRE antes de una migracion.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const dump: Record<string, unknown[]> = {};

  dump.user = await prisma.user.findMany();
  dump.project = await prisma.project.findMany();
  dump.cost = await prisma.cost.findMany();
  dump.expense = await prisma.expense.findMany();
  dump.investor = await prisma.investor.findMany();
  dump.projectAccess = await prisma.projectAccess.findMany();
  dump.timelineEvent = await prisma.timelineEvent.findMany();
  dump.notification = await prisma.notification.findMany();
  dump.partida = await prisma.partida.findMany();
  dump.cotizacion = await prisma.cotizacion.findMany();
  dump.account = await prisma.account.findMany();
  dump.session = await prisma.session.findMany();

  const dir = path.join(process.cwd(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = path.join(dir, `backup-${stamp}.json`);
  fs.writeFileSync(out, JSON.stringify(dump, null, 2));

  console.log(`\nBackup guardado en: ${out}\n`);
  for (const [tabla, filas] of Object.entries(dump)) {
    console.log(`  ${tabla.padEnd(16)} ${filas.length}`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error("Error haciendo el backup:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
