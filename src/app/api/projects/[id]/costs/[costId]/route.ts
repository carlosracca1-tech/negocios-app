import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
  updateCostSchema,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; costId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.id;
    const costId = params.costId;

    // Check access - must be admin or have "interactuar" role
    if (!isAdmin(user)) {
      const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Verify cost exists and belongs to project
    const cost = await prisma.cost.findUnique({
      where: { id: costId },
    });

    if (!cost || cost.projectId !== projectId) {
      return NextResponse.json({ error: "Cost not found" }, { status: 404 });
    }

    const body = await request.json();

    // Validate with Zod
    const validation = updateCostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const data = validation.data;

    // Recalcular amountUsd si cambian amount, currency o exchangeRate
    const newAmount = data.amount ?? cost.amount;
    const newCurrency = data.currency ?? (cost as any).currency ?? "USD";
    const newRate = data.exchangeRate !== undefined ? data.exchangeRate : (cost as any).exchangeRate;

    let amountUsd: number | null = null;
    if (newCurrency === "ARS" && newRate && newRate > 0) {
      amountUsd = newAmount / newRate;
    } else if (newCurrency === "USD") {
      amountUsd = newAmount;
    }

    // Update cost and project lastUpdate in transaction
    const updatedCost = await prisma.$transaction(async (tx) => {
      const updated = await tx.cost.update({
        where: { id: costId },
        data: {
          concept: data.concept,
          amount: data.amount,
          currency: data.currency,
          exchangeRate: data.exchangeRate,
          amountUsd,
          category: data.category,
          costType: data.costType,
          date: data.date ? new Date(data.date) : undefined,
        },
      });

      // Update project lastUpdate
      await tx.project.update({
        where: { id: projectId },
        data: {
          lastUpdate: new Date(),
        },
      });

      return updated;
    });

    return NextResponse.json({ data: updatedCost });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error updating cost:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; costId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.id;
    const costId = params.costId;

    // Check access - must be admin or have "interactuar" role
    if (!isAdmin(user)) {
      const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Verify cost exists and belongs to project
    const cost = await prisma.cost.findUnique({
      where: { id: costId },
    });

    if (!cost || cost.projectId !== projectId) {
      return NextResponse.json({ error: "Cost not found" }, { status: 404 });
    }

    // Delete cost and create timeline event in transaction
    await prisma.$transaction(async (tx) => {
      await tx.cost.delete({
        where: { id: costId },
      });

      // Auto-create timeline event
      await tx.timelineEvent.create({
        data: {
          projectId,
          action: "Costo eliminado",
          detail: `${cost.concept} - $${cost.amount}`,
        },
      });

      // Update project lastUpdate
      await tx.project.update({
        where: { id: projectId },
        data: {
          lastUpdate: new Date(),
        },
      });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error deleting cost:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
