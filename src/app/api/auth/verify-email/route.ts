/**
 * POST /api/auth/verify-email  { token }
 *
 * Marca el email como verificado. El token viene del link del mail.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validarTokenVerificacion } from "@/lib/tokens";

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const { token } = schema.parse(await req.json());

    const valido = await validarTokenVerificacion(token);
    if (!valido) {
      return NextResponse.json(
        { error: "El link venció o ya se usó. Pedí uno nuevo desde la pantalla de ingreso." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: valido.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: valido.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ message: "Email verificado. Ya podés iniciar sesión." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Link inválido" }, { status: 400 });
    }
    console.error("verify-email:", error);
    return NextResponse.json({ error: "No se pudo verificar el email" }, { status: 500 });
  }
}
