import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/api-helpers";
import { z } from "zod";
import { crearTokenVerificacion } from "@/lib/tokens";
import { baseUrl, enviarMail, mailVerificacion } from "@/lib/email";

const registerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  role: z.enum(["admin", "colaborador", "vista"]).optional().default("vista"),
});

export async function POST(req: NextRequest) {
  try {
    // Solo admin puede crear usuarios
    const currentUser = await getCurrentUser();
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json(
        { error: "Solo administradores pueden crear cuentas" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = registerSchema.parse(body);
    // Siempre en minusculas: si no, "Juan@x.com" y "juan@x.com" conviven como
    // dos cuentas distintas y la recuperacion de clave no encuentra la buena.
    data.email = data.email.trim().toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role, // Admin puede elegir el rol, default "vista"
        // Cuenta nueva: no entra hasta confirmar que el email es real.
        requiresVerification: true,
      },
    });

    // Mail de confirmacion. Si falla el envio la cuenta igual queda creada:
    // el admin puede reenviarlo despues desde la pantalla de ingreso.
    let mailEnviado = true;
    try {
      const token = await crearTokenVerificacion(user.id);
      const url = `${baseUrl()}/verify-email?token=${token}`;
      const { subject, html, text } = mailVerificacion(user.name, url);
      await enviarMail({ to: user.email, subject, html, text });
    } catch (e) {
      mailEnviado = false;
      console.error("No se pudo enviar la verificación:", e);
    }

    return NextResponse.json({
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
      mailEnviado,
      message: mailEnviado
        ? "Cuenta creada. Le mandamos un mail para que confirme su dirección."
        : "Cuenta creada, pero no se pudo enviar el mail de confirmación. Reenvialo desde la pantalla de ingreso.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Error al crear la cuenta" },
      { status: 500 }
    );
  }
}
