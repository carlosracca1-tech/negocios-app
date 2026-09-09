/**
 * GET /api/auth/estado
 *
 * Dice si el usuario logueado ya verifico su email. Lo consulta el cartel que
 * aparece arriba de todo.
 *
 * Va por endpoint y no dentro del JWT porque el token dura 30 dias: si el dato
 * viviera ahi, el cartel seguiria apareciendo despues de verificar hasta que
 * la sesion se renovara.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-helpers";

export async function GET() {
  const actual = await getCurrentUser();
  if (!actual) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: actual.id },
    select: { email: true, emailVerified: true },
  });

  return NextResponse.json({
    email: user?.email ?? null,
    emailVerificado: Boolean(user?.emailVerified),
  });
}
