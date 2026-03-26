import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
  updateProjectSchema,
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

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        costs: {
          orderBy: {
            date: "desc",
          },
        },
        investors: true,
        access: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        timeline: {
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Add computed fields
    const totalCosts = project.costs.reduce((sum, cost) => sum + cost.amount, 0);
    const investment = project.buyPrice + totalCosts;
    const result = project.salePrice ? project.salePrice - investment : 0;
    const margin = project.salePrice ? ((result / project.salePrice) * 100) : 0;
    const estimatedMargin = project.listingPrice
      ? (((project.listingPrice - investment) / project.listingPrice) * 100)
      : 0;

    const projectWithComputed = {
      ...project,
      totalCosts,
      investment,
      result,
      margin,
      estimatedMargin,
    };

    return NextResponse.json({ data: projectWithComputed });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Get current project to detect status changes
    const currentProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!currentProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();

    // Validate with Zod
    const validation = updateProjectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const data = validation.data;

    // Prepare timeline events
    const timelineEvents = [];

    // Check for status change
    if (data.status && data.status !== currentProject.status) {
      timelineEvents.push({
        projectId,
        action: "Estado actualizado",
        detail: `Estado cambió de "${currentProject.status}" a "${data.status}"`,
      });
    }

    // Check for sale registration (salePrice being set for first time or status becomes "vendido")
    if (
      data.salePrice &&
      (data.salePrice !== currentProject.salePrice ||
        (data.status === "vendido" && currentProject.status !== "vendido"))
    ) {
      timelineEvents.push({
        projectId,
        action: "Venta registrada",
        detail: `Proyecto vendido por $${data.salePrice}`,
      });
    }

    // Update project and create timeline events in transaction
    const updatedProject = await prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          ...data,
          lastUpdate: new Date(),
        },
      });

      // Create timeline events
      for (const event of timelineEvents) {
        await tx.timelineEvent.create({
          data: event,
        });
      }

      return updated;
    });

    return NextResponse.json({ data: updatedProject });
  } catch (error) {
    console.error("Error updating project:", error);
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
        { error: "Only admin can delete projects" },
        { status: 403 }
      );
    }

    const projectId = params.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete project (cascade will handle related records)
    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
