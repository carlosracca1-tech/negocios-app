import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

/**
 * Alta y listado de cuentas (organizaciones).
 *
 * Reservado al superadmin: es el unico rol que puede crear una cuenta nueva.
 * Ojo: el superadmin ve la LISTA de cuentas y cuantos proyectos tiene cada una,
 * pero no puede entrar a ver los datos de ninguna. La separacion se mantiene.
 */

const crearCuentaSchema = z.object({
  nombreCuenta: z.string().min(1, "El nombre de la cuenta es requerido"),
  nombreAdmin: z.string().min(1, "El nombre del administrador es requerido"),
  email: z.string().email("Email invalido"),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
});

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cuentas = await prisma.organization.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { users: true, projects: true } },
        users: {
          where: { role: "admin" },
          select: { id: true, name: true, email: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      data: cuentas.map((c) => ({
        id: c.id,
        name: c.name,
        createdAt: c.createdAt,
        cantidadUsuarios: c._count.users,
        cantidadProyectos: c._count.projects,
        admins: c.users,
        esLaMia: c.id === user.organizationId,
      })),
    });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error listando cuentas:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Solo el dueno del sistema puede crear cuentas" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validacion = crearCuentaSchema.safeParse(body);

    if (!validacion.success) {
      return NextResponse.json(
        { error: validacion.error.errors[0].message },
        { status: 422 }
      );
    }

    const data = validacion.data;
    const email = data.email.trim().toLowerCase();

    // El email es unico en todo el sistema (no solo dentro de la cuenta):
    // si ya existe, no se puede reutilizar aunque sea para otra organizacion.
    const existente = await prisma.user.findUnique({ where: { email } });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email en el sistema" },
        { status: 422 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // La cuenta y su primer admin se crean juntas o no se crea ninguna:
    // una organizacion sin admin quedaria inaccesible para siempre.
    const cuenta = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: data.nombreCuenta },
      });

      await tx.user.create({
        data: {
          name: data.nombreAdmin,
          email,
          password: hashedPassword,
          role: "admin",
          organizationId: org.id,
          // Entra directo con la clave que le pasas: el alta la hace el dueno
          // del sistema, no hay nada que verificar por mail.
          requiresVerification: false,
          emailVerified: new Date(),
        },
      });

      return org;
    });

    return NextResponse.json(
      {
        data: {
          id: cuenta.id,
          name: cuenta.name,
          createdAt: cuenta.createdAt,
          cantidadUsuarios: 1,
          cantidadProyectos: 0,
          admins: [{ id: "", name: data.nombreAdmin, email }],
          esLaMia: false,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    rethrowNextError(error);
    console.error("Error creando cuenta:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
