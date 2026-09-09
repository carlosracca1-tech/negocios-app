/**
 * POST /api/auth/reset-password  { token, password }
 *
 * Consume el token del mail y escribe la contrasena nueva.
 *
 * De paso da por verificado el email: para tener el token hubo que abrir ese
 * mail, que es exactamente la prueba que pide la verificacion.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validarTokenReset } from "@/lib/tokens";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function POST(req: NextRequest) {
  try {
    const { token, password } = schema.parse(await req.json());

    const valido = await validarTokenReset(token);
    if (!valido) {
      return NextResponse.json(
        { error: "El link venció o ya se usó. Pedí uno nuevo desde «Olvidé mi contraseña»." },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: valido.userId },
        data: { password: hash, emailVerified: new Date() },
      }),
      prisma.passwordResetToken.update({
        where: { id: valido.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Nota: las sesiones son JWT (no se guardan en la base), asi que una sesion
    // ya abierta con la clave vieja sigue viva hasta que venza. Si en algun
    // momento hace falta cortarlas al cambiar la clave, hay que sumar un campo
    // tipo passwordChangedAt y compararlo en el callback jwt.

    return NextResponse.json({ message: "Contraseña actualizada. Ya podés iniciar sesión." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("reset-password:", error);
    return NextResponse.json({ error: "No se pudo cambiar la contraseña" }, { status: 500 });
  }
}
