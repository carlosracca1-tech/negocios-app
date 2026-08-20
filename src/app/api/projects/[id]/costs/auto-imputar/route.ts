import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin, checkProjectAccess } from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import { planificarImputacion } from "@/lib/imputacion";

export const dynamic = "force-dynamic";

/**
 * POST /api/projects/[id]/costs/auto-imputar
 *
 * Imputa a su presupuesto los costos que hoy no tienen ninguno, cuando el
 * proveedor se reconoce sin ambigüedad en el concepto.
 *
 * Body: { aplicar?: boolean }  — sin aplicar:true devuelve solo el plan.
 */
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

    const body = await request.json().catch(() => ({}));
    const aplicar = body?.aplicar === true;

    const [partidas, costs] = await Promise.all([
      prisma.partida.findMany({
        where: { projectId },
        include: { cotizaciones: { select: { provider: true } } },
        orderBy: { order: "asc" },
      }),
      prisma.cost.findMany({
        where: { projectId },
        select: { id: true, concept: true, partidaId: true },
        orderBy: { date: "desc" },
      }),
    ]);

    if (partidas.length === 0) {
      return NextResponse.json({
        data: {
          aplicado: false,
          imputar: [],
          dejar: [],
          sinPresupuestos: true,
          totalCostos: costs.length,
        },
      });
    }

    const plan = planificarImputacion(costs, partidas);

    if (!aplicar) {
      return NextResponse.json({
        data: { aplicado: false, ...plan, sinPresupuestos: false, totalCostos: costs.length },
      });
    }

    if (plan.imputar.length === 0) {
      return NextResponse.json({
        data: { aplicado: true, ...plan, sinPresupuestos: false, totalCostos: costs.length },
      });
    }

    // Un updateMany por presupuesto en vez de uno por costo.
    // El filtro partidaId: null se vuelve a aplicar acá: si el usuario imputó
    // algo a mano entre el preview y el OK, no se lo pisamos.
    const porPartida = new Map<string, string[]>();
    plan.imputar.forEach((i) => {
      const lista = porPartida.get(i.partidaId) || [];
      lista.push(i.costId);
      porPartida.set(i.partidaId, lista);
    });

    await prisma.$transaction(async (tx) => {
      for (const [partidaId, costIds] of porPartida) {
        await tx.cost.updateMany({
          where: { id: { in: costIds }, projectId, partidaId: null },
          data: { partidaId },
        });
      }

      await tx.timelineEvent.create({
        data: {
          projectId,
          action: "Costos imputados",
          detail: `${plan.imputar.length} costos asignados automáticamente a su presupuesto`,
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { lastUpdate: new Date() },
      });
    });

    return NextResponse.json({
      data: { aplicado: true, ...plan, sinPresupuestos: false, totalCostos: costs.length },
    });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error en auto-imputar:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
