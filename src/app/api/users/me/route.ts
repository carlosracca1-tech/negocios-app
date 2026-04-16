import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch full user data from DB (getCurrentUser only returns session data)
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data: fullUser });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error fetching current user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  email: z.string().email("Email inválido").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateProfileSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (data.name) updateData.name = data.name;
    if (data.email) {
      // Check if email is taken by another user
      const existing = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id: user.id } },
      });
      if (existing) {
        return NextResponse.json({ error: "Ese email ya está en uso" }, { status: 400 });
      }
      updateData.email = data.email;
    }

    if (data.newPassword) {
      if (!data.currentPassword) {
        return NextResponse.json({ error: "Debés ingresar tu contraseña actual" }, { status: 400 });
      }
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }
      const valid = await bcrypt.compare(data.currentPassword, dbUser.password);
      if (!valid) {
        return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(data.newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay cambios para guardar" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    rethrowNextError(error);
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Error al actualizar perfil" },
      { status: 500 }
    );
  }
}
