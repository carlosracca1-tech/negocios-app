/**
 * POST /api/auth/verify-email/resend  { email }
 *
 * Reenvia el mail de verificacion. Igual que forgot-password, responde
 * siempre lo mismo para no delatar que emails estan registrados.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { crearTokenVerificacion } from "@/lib/tokens";
import { baseUrl, enviarMail, mailVerificacion } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

const RESPUESTA_NEUTRA = {
  message: "Si esa cuenta existe y falta verificarla, te mandamos el mail de confirmación.",
};

export async function POST(req: NextRequest) {
  try {
    const { email } = schema.parse(await req.json());
    const normalizado = email.trim().toLowerCase();

    const { allowed } = checkRateLimit(`verify:${normalizado}`);
    if (!allowed) return NextResponse.json(RESPUESTA_NEUTRA);

    const user = await prisma.user.findUnique({ where: { email: normalizado } });

    if (user && !user.emailVerified) {
      const token = await crearTokenVerificacion(user.id);
      const url = `${baseUrl()}/verify-email?token=${token}`;
      const { subject, html, text } = mailVerificacion(user.name, url);
      try {
        await enviarMail({ to: user.email, subject, html, text });
      } catch (e) {
        console.error("No se pudo reenviar la verificación:", e);
      }
    }

    return NextResponse.json(RESPUESTA_NEUTRA);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    console.error("resend verify:", error);
    return NextResponse.json(RESPUESTA_NEUTRA);
  }
}
