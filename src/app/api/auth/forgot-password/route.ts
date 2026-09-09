/**
 * POST /api/auth/forgot-password  { email }
 *
 * Manda el mail con el link para elegir una contrasena nueva.
 *
 * Responde SIEMPRE lo mismo exista o no la cuenta. Si contestara distinto,
 * cualquiera podria averiguar que emails estan registrados probando de a uno.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { crearTokenReset } from "@/lib/tokens";
import { baseUrl, enviarMail, mailReset } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

const RESPUESTA_NEUTRA = {
  message: "Si hay una cuenta con ese email, te mandamos un link para restablecer la contraseña.",
};

export async function POST(req: NextRequest) {
  try {
    const { email } = schema.parse(await req.json());
    const normalizado = email.trim().toLowerCase();

    const { allowed } = checkRateLimit(`forgot:${normalizado}`);
    if (!allowed) return NextResponse.json(RESPUESTA_NEUTRA);

    const user = await prisma.user.findUnique({ where: { email: normalizado } });

    if (user) {
      const token = await crearTokenReset(user.id);
      const url = `${baseUrl()}/reset-password?token=${token}`;
      const { subject, html, text } = mailReset(user.name, url);
      try {
        await enviarMail({ to: user.email, subject, html, text });
      } catch (e) {
        // El mail fallo, pero no lo decimos: revelaria que la cuenta existe.
        console.error("No se pudo enviar el mail de reset:", e);
      }
    }

    return NextResponse.json(RESPUESTA_NEUTRA);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    console.error("forgot-password:", error);
    return NextResponse.json(RESPUESTA_NEUTRA);
  }
}
