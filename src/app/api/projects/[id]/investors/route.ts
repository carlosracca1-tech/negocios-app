import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
  addInvestorSchema,
  updateInvestorSchema,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import { z } from "zod";

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

    // Only admin can see investors
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Only admin can view investors" },
        { status: 403 }
      );
    }

    const projectId = params.id;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const investors = await prisma.investor.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { capitalPercentage: "desc" },
    });

    return NextResponse.json({ data: investors });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error fetching investors:", error);
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

    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Solo admin puede agregar inversores" },
        { status: 403 }
      );
    }

    const projectId = params.id;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();

    // Validate with Zod
    const validation = addInvestorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const data = validation.data;

    // Check total percentages don't exceed 100%
    const existingInvestors = await prisma.investor.findMany({
      where: { projectId },
    });

    const totalCapital = existingInvestors.reduce(
      (sum, inv) => sum + inv.capitalPercentage,
      0
    );
    const totalProfit = existingInvestors.reduce(
      (sum, inv) => sum + inv.profitPercentage,
      0
    );

    if (totalCapital + data.capitalPercentage > 100) {
      return NextResponse.json(
        {
          error: `El capital total excede 100% (actual: ${totalCapital.toFixed(1)}%)`,
        },
        { status: 400 }
      );
    }
    if (totalProfit + data.profitPercentage > 100) {
      return NextResponse.json(
        {
          error: `Los dividendos totales exceden 100% (actual: ${totalProfit.toFixed(1)}%)`,
        },
        { status: 400 }
      );
    }

    // If userId provided, verify user exists
    if (data.userId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: data.userId },
      });
      if (!targetUser) {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }
    }

    const investor = await prisma.investor.create({
      data: {
        projectId,
        name: data.name,
        capitalPercentage: data.capitalPercentage,
        profitPercentage: data.profitPercentage,
        amountInvested: data.amountInvested || 0,
        userId: data.userId || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Create timeline event
    await prisma.timelineEvent.create({
      data: {
        projectId,
        action: "investor_added",
        detail: `${data.name} agregado como inversor (${data.capitalPercentage}% capital, ${data.profitPercentage}% ganancia)`,
      },
    });

    // Update project lastUpdate
    await prisma.project.update({
      where: { id: projectId },
      data: { lastUpdate: new Date() },
    });

    return NextResponse.json({ data: investor }, { status: 201 });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error adding investor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const projectId = params.id;
    const body = await request.json();
    const { investorId } = body;

    if (!investorId) {
      return NextResponse.json(
        { error: "investorId is required" },
        { status: 422 }
      );
    }

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

// PATCH - Update investor
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const projectId = params.id;
    const body = await request.json();

    // Validar con Zod — NUNCA pasar datos crudos a Prisma
    const validation = updateInvestorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const { investorId, ...updateData } = validation.data;

    // Verify investor exists and belongs to project
    const investor = await prisma.investor.findUnique({
      where: { id: investorId },
    });

    if (!investor || investor.projectId !== projectId) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    // Validar que porcentajes totales no excedan 100%
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
