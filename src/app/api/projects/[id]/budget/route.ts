import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkProjectAccess } from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import { computeBudgetProjection } from "@/lib/financial";

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
      include: { cotizaciones: true },
      orderBy: { order: "asc" },
    });

    const costs = await prisma.cost.findMany({
      where: { projectId },
    });

    const projection = computeBudgetProjection(partidas, costs);

    return NextResponse.json({ data: projection });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
