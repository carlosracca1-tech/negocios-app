import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
  updateCotizacionSchema,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

export async function PATCH(
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
    });
    if (!cot) {
      return NextResponse.json({ error: "Cotizacion not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateCotizacionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const data = validation.data;

    // Recalcular amountUsd si cambian amount/currency/exchangeRate
    const newAmount = data.amount ?? cot.amount;
    const newCurrency = data.currency ?? cot.currency;
    const newRate = data.exchangeRate !== undefined ? data.exchangeRate : cot.exchangeRate;

    let amountUsd: number | null = null;
    if (newCurrency === "ARS" && newRate && newRate > 0) {
      amountUsd = newAmount / newRate;
    } else if (newCurrency === "USD") {
      amountUsd = newAmount;
    }

    // Build update payload — handle JSON null for scopeItems
    const updateData: Prisma.CotizacionUpdateInput = {
      ...data,
      amountUsd,
      scopeItems: data.scopeItems === null
        ? Prisma.JsonNull
        : data.scopeItems !== undefined
        ? data.scopeItems
        : undefined,
    };

    const updated = await prisma.cotizacion.update({
      where: { id: cotId },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error updating cotizacion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; partidaId: string; cotId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, cotId } = params;

    if (!isAdmin(user)) {
      const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const cot = await prisma.cotizacion.findFirst({
      where: { id: cotId, partida: { projectId } },
    });
    if (!cot) {
      return NextResponse.json({ error: "Cotizacion not found" }, { status: 404 });
    }

    await prisma.cotizacion.delete({ where: { id: cotId } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error deleting cotizacion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
