/**
 * Lista las cuentas que existen en la base, para saber con que email entrar.
 *
 * Uso:
 *   npm run usuarios
 *
 * No muestra ni puede mostrar contrasenas: se guardan hasheadas con bcrypt y
 * el hash no es reversible. Si no te acordas la clave, usa `npm run password`.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) {
    console.log("No hay ninguna cuenta en la base.");
    return;
  }

  console.log(`\n${users.length} cuenta(s):\n`);
  for (const u of users) {
    const fecha = u.createdAt.toISOString().split("T")[0];
    console.log(`  ${u.email}`);
    console.log(`    nombre: ${u.name}   rol: ${u.role}   creada: ${fecha}\n`);
  }
  console.log("Para cambiar una clave:  npm run password -- --email <email> --nueva <clave>\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
