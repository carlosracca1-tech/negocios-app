import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
  createCostSchema,
} from "@/lib/api-helpers";

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

    // Check access
    const hasAccess = await checkProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const costs = await prisma.cost.findMany({
      where: { projectId },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({ data: costs });
  } catch (error) {
    console.error("Error fetching costs:", error);
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

    // Check access - must be admin or have "interactuar" role
    if (!isAdmin(user)) {
      const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();

    // Validate with Zod
    const validation = createCostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const data = validation.data;

    // Create cost and timeline event in transaction, also update project lastUpdate
    const cost = await prisma.$transaction(async (tx) => {
      const newCost = await tx.cost.create({
        data: {
          projectId,
          concept: data.concept,
          amount: data.amount,
          category: data.category,
          costType: data.costType,
          date: new Date(data.date),
        },
      });

      // Auto-create timeline event
      await tx.timelineEvent.create({
        data: {
          projectId,
          action: "Costo agregado",
          detail: `${data.concept} - $${data.amount}`,
        },
      });

      // Update project lastUpdate
      await tx.project.update({
        where: { id: projectId },
        data: {
          lastUpdate: new Date(),
        },
      });

      return newCost;
    });

    return NextResponse.json({ data: cost }, { status: 201 });
  } catch (error) {
    console.error("Error creating cost:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
