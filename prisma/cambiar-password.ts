/**
 * Cambia la contrasena de una cuenta existente.
 *
 * Las contrasenas se guardan hasheadas con bcrypt, asi que la original no se
 * puede recuperar: lo unico posible es escribir una nueva.
 *
 * Uso:
 *   npm run password -- --email carlos@ejemplo.com --nueva "MiClaveNueva123"
 *
 * Sin --nueva solo dice si la cuenta existe, no toca nada.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const nueva = arg("nueva");

  if (!email) {
    console.error('Falta --email. Ej: npm run password -- --email vos@mail.com --nueva "Clave123"');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No existe ninguna cuenta con el email ${email}.`);
    console.error("Corre `npm run usuarios` para ver los emails que si existen.");
    process.exit(1);
  }

  if (!nueva) {
    console.log(`La cuenta ${email} existe (nombre: ${user.name}, rol: ${user.role}).`);
    console.log('Para cambiarle la clave agrega --nueva "TuClaveNueva".');
    return;
  }

  if (nueva.length < 8) {
    console.error("La clave nueva tiene que tener al menos 8 caracteres.");
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { password: await bcrypt.hash(nueva, 10) },
  });

  console.log(`Listo. La clave de ${email} quedo cambiada. Ya podes entrar con ella.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
