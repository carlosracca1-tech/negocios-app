import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  updateInvestorSchema,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; investorId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Solo admin puede editar inversores" },
        { status: 403 }
      );
    }

    const { id: projectId, investorId } = params;
    const body = await request.json();

    // Validar con Zod (investorId viene de URL, no del body)
    const validation = updateInvestorSchema.omit({ investorId: true }).safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const updateData = validation.data;

    // Verify investor exists and belongs to project
    const investor = await prisma.investor.findUnique({
      where: { id: investorId },
    });

    if (!investor || investor.projectId !== projectId) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    // Validar porcentajes totales
    if (updateData.capitalPercentage !== undefined || updateData.profitPercentage !== undefined) {
      const otherInvestors = await prisma.investor.findMany({
        where: { projectId, id: { not: investorId } },
      });
      const totalCapital = otherInvestors.reduce((s, i) => s + i.capitalPercentage, 0);
      const totalProfit = otherInvestors.reduce((s, i) => s + i.profitPercentage, 0);
      const newCapital = updateData.capitalPercentage ?? investor.capitalPercentage;
      const newProfit = updateData.profitPercentage ?? investor.profitPercentage;

      if (totalCapital + newCapital > 100) {
        return NextResponse.json(
          { error: `Capital total excederia 100% (otros: ${totalCapital.toFixed(1)}%)` },
          { status: 400 }
        );
      }
      if (totalProfit + newProfit > 100) {
        return NextResponse.json(
          { error: `Dividendos totales excederian 100% (otros: ${totalProfit.toFixed(1)}%)` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.investor.update({
      where: { id: investorId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error updating investor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; investorId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Solo admin puede eliminar inversores" },
        { status: 403 }
      );
    }

    const { id: projectId, investorId } = params;

    // Verify investor exists and belongs to project
    const investor = await prisma.investor.findUnique({
      where: { id: investorId },
    });

    if (!investor || investor.projectId !== projectId) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    await prisma.investor.delete({
      where: { id: investorId },
    });

    // Timeline event
    await prisma.timelineEvent.create({
      data: {
        projectId,
        action: "Inversor eliminado",
        detail: `${investor.name} removido del proyecto`,
      },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error deleting investor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
