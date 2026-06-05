import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
  createPartidaSchema,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import { notifyProjectUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.id;

    const hasAccess = await checkProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const partidas = await prisma.partida.findMany({
      where: { projectId },
      include: {
        cotizaciones: {
          orderBy: { createdAt: "desc" },
        },
        costs: true,
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ data: partidas });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error fetching partidas:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.id;

    if (!isAdmin(user)) {
      const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();

    const validation = createPartidaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const data = validation.data;

    const partida = await prisma.$transaction(async (tx) => {
      const newPartida = await tx.partida.create({
        data: {
          projectId,
          name: data.name,
          category: data.category,
          description: data.description ?? null,
          estimatedAmount: data.estimatedAmount ?? null,
          order: data.order ?? 0,
        },
      });

      await tx.timelineEvent.create({
        data: {
          projectId,
          action: "Rubro agregado",
          detail: `${data.name} (${data.category})`,
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { lastUpdate: new Date() },
      });

      return newPartida;
    });

    await notifyProjectUsers(
      projectId,
      "partida_added",
      `Nuevo rubro: ${data.name}`,
      user.id
    );

    return NextResponse.json({ data: partida }, { status: 201 });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error creating partida:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
