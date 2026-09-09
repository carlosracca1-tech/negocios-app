/**
 * Migracion a multi-cuenta.
 *
 *   npx tsx prisma/migrar-a-multicuenta.ts "Charlie" carlosracca1@gmail.com
 *                                           ^cuenta   ^email del superadmin
 *
 * Que hace, en una sola transaccion:
 *   1. Crea la cuenta (Organization) que va a ser duena de todo lo que ya existe.
 *   2. Mete a TODOS los usuarios actuales en esa cuenta.
 *   3. Mete a TODOS los proyectos actuales en esa cuenta.
 *   4. Marca a un usuario como superadmin (el unico que puede crear cuentas).
 *
 * Es idempotente: si ya existe una cuenta y no quedan filas sueltas, no toca nada.
 * Corre DESPUES de `npx prisma db push` y SIEMPRE despues de un backup.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NOMBRE_CUENTA = process.argv[2] || "Cuenta principal";
const EMAIL_SUPERADMIN = (process.argv[3] || "").trim().toLowerCase();

async function main() {
  console.log("\n=== Migracion a multi-cuenta ===\n");

  const usuariosSueltos = await prisma.user.count({ where: { organizationId: null } });
  const proyectosSueltos = await prisma.project.count({ where: { organizationId: null } });
  const cuentasExistentes = await prisma.organization.count();

  console.log(`  Cuentas ya creadas:      ${cuentasExistentes}`);
  console.log(`  Usuarios sin cuenta:     ${usuariosSueltos}`);
  console.log(`  Proyectos sin cuenta:    ${proyectosSueltos}\n`);

  if (usuariosSueltos === 0 && proyectosSueltos === 0) {
    console.log("  No hay nada suelto: la migracion ya estaba hecha.\n");
    await marcarSuperadmin();
    return;
  }

  // Si ya hay exactamente una cuenta la reutilizamos; si hay varias no
  // adivinamos a cual mandar los datos sueltos.
  if (cuentasExistentes > 1) {
    throw new Error(
      "Hay mas de una cuenta creada y todavia quedan filas sin asignar. " +
        "Revisalo a mano antes de seguir."
    );
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const cuenta =
      (await tx.organization.findFirst()) ??
      (await tx.organization.create({ data: { name: NOMBRE_CUENTA } }));

    const users = await tx.user.updateMany({
      where: { organizationId: null },
      data: { organizationId: cuenta.id },
    });

    const projects = await tx.project.updateMany({
      where: { organizationId: null },
      data: { organizationId: cuenta.id },
    });

    return { cuenta, users: users.count, projects: projects.count };
  });

  console.log(`  Cuenta: "${resultado.cuenta.name}" (${resultado.cuenta.id})`);
  console.log(`  Usuarios asignados:      ${resultado.users}`);
  console.log(`  Proyectos asignados:     ${resultado.projects}\n`);

  await marcarSuperadmin();
  await verificar();
}

async function marcarSuperadmin() {
  if (!EMAIL_SUPERADMIN) {
    console.log("  (No pasaste email de superadmin: nadie quedo marcado)\n");
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: EMAIL_SUPERADMIN } });

  if (!user) {
    throw new Error(`No existe ningun usuario con el email ${EMAIL_SUPERADMIN}`);
  }

  if (user.isSuperAdmin && user.role === "admin") {
    console.log(`  Superadmin: ${user.email} (ya lo era)\n`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isSuperAdmin: true, role: "admin" },
  });

  console.log(`  Superadmin: ${user.email}\n`);
}

async function verificar() {
  const usuariosSueltos = await prisma.user.count({ where: { organizationId: null } });
  const proyectosSueltos = await prisma.project.count({ where: { organizationId: null } });

  if (usuariosSueltos || proyectosSueltos) {
    throw new Error(
      `Quedaron filas sin cuenta (usuarios: ${usuariosSueltos}, proyectos: ${proyectosSueltos})`
    );
  }

  const superadmins = await prisma.user.count({ where: { isSuperAdmin: true } });

  console.log("  Verificacion final:");
  console.log("    - No quedan usuarios ni proyectos sin cuenta.");
  console.log(`    - Superadmins en el sistema: ${superadmins}\n`);
  console.log("  Listo. Cerra sesion y volve a entrar para que la app te");
  console.log("  reconozca como superadmin (aparece el boton 'Cuentas').\n");
}

main()
  .catch((e) => {
    console.error("\n  ERROR — no se aplico nada de la transaccion:\n", e.message, "\n");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
