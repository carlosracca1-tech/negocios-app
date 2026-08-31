import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
  createCotizacionSchema,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import { notifyProjectUsers } from "@/lib/notifications";
import { resolverTipoDeCambio } from "@/lib/dolar";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; partidaId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, partidaId } = params;

    const hasAccess = await checkProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cotizaciones = await prisma.cotizacion.findMany({
      where: { partidaId, partida: { projectId } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: cotizaciones });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error fetching cotizaciones:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; partidaId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, partidaId } = params;

    if (!isAdmin(user)) {
      const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const partida = await prisma.partida.findFirst({
      where: { id: partidaId, projectId },
    });
    if (!partida) {
      return NextResponse.json({ error: "Partida not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = createCotizacionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const data = validation.data;

    // Igual que en costos: la cotizacion nunca debe quedar sin TC, o el
    // presupuesto aparece como "sin monto cargado" en la vista en pesos.
    const exchangeRate = await resolverTipoDeCambio(data.exchangeRate);

    // Calcular amountUsd
    let amountUsd: number | null = null;
    if (data.currency === "ARS" && exchangeRate && exchangeRate > 0) {
      amountUsd = data.amount / exchangeRate;
    } else if (data.currency === "USD") {
      amountUsd = data.amount;
    }

    const cotizacion = await prisma.$transaction(async (tx) => {
      const newCot = await tx.cotizacion.create({
        data: {
          partidaId,
          provider: data.provider,
          amount: data.amount,
          currency: data.currency || "USD",
          exchangeRate,
          amountUsd,
          scopeItems: data.scopeItems ?? undefined,
          leadTimeDays: data.leadTimeDays ?? null,
          leadTimeText: data.leadTimeText ?? null,
          paymentTerms: data.paymentTerms ?? null,
          warranty: data.warranty ?? null,
          validityDays: data.validityDays ?? null,
          notes: data.notes ?? null,
          fileUrl: data.fileUrl ?? null,
          fileName: data.fileName ?? null,
        },
      });

      const currencyLabel = data.currency === "ARS" ? "AR$" : "USD";
      await tx.timelineEvent.create({
        data: {
          projectId,
          action: "Cotizacion agregada",
          detail: `${data.provider} — ${currencyLabel} ${data.amount} en ${partida.name}`,
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { lastUpdate: new Date() },
      });

      return newCot;
    });

    await notifyProjectUsers(
      projectId,
      "cotizacion_added",
      `Nueva cotizacion: ${data.provider} en ${partida.name}`,
      user.id
    );

    return NextResponse.json({ data: cotizacion }, { status: 201 });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error creating cotizacion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
