import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import { notifyProjectUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; partidaId: string; cotId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, partidaId, cotId } = params;

    if (!isAdmin(user)) {
      const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const cot = await prisma.cotizacion.findFirst({
      where: { id: cotId, partidaId, partida: { projectId } },
      include: { partida: true },
    });
    if (!cot) {
      return NextResponse.json({ error: "Cotizacion not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Unmark all cotizaciones of this partida
      await tx.cotizacion.updateMany({
        where: { partidaId },
        data: { isChosen: false },
      });

      // Mark this one as chosen
      const chosen = await tx.cotizacion.update({
        where: { id: cotId },
        data: { isChosen: true },
      });

      // Update partida status
      await tx.partida.update({
        where: { id: partidaId },
        data: { status: "elegida" },
      });

      // Timeline event
      const currencyLabel = cot.currency === "ARS" ? "AR$" : "USD";
      await tx.timelineEvent.create({
        data: {
          projectId,
          action: "Cotizacion elegida",
          detail: `${cot.provider} — ${currencyLabel} ${cot.amount} elegida para ${cot.partida.name}`,
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { lastUpdate: new Date() },
      });

      return chosen;
    });

    await notifyProjectUsers(
      projectId,
      "cotizacion_chosen",
      `Cotizacion elegida: ${cot.provider} para ${cot.partida.name}`,
      user.id
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error choosing cotizacion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
