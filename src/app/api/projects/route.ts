import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
  createProjectSchema,
} from "@/lib/api-helpers";
import { computeProjectFinancials, safe } from "@/lib/financial";
import { rethrowNextError } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let projects;

    if (isAdmin(user)) {
      // Admin sees all projects
      projects = await prisma.project.findMany({
        include: {
          costs: true,
          expenses: true,
          investors: {
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
          access: { include: { user: true } },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      // Regular user sees projects they have access to
      projects = await prisma.project.findMany({
        where: {
          access: {
            some: {
              userId: user.id,
            },
          },
        },
        include: {
          costs: true,
          expenses: true,
          investors: {
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
          access: { include: { user: true } },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    // Add computed fields using centralized financial logic
    const userIsAdmin = isAdmin(user);
    const projectsWithComputed = projects.map((project) => {
      const financials = computeProjectFinancials(project, project.costs, project.expenses);

      // Filtrar inversores para no-admin: solo muestra los vinculados al usuario
      const filteredInvestors = userIsAdmin
        ? project.investors
        : project.investors.filter((inv) => inv.userId === user.id);

      return {
        ...project,
        buyPrice: safe(project.buyPrice),
        ...financials,
        investors: filteredInvestors,
        investorCount: project.investors.length, // Count real para KPI
        costCount: project.costs.length,
      };
    });

    return NextResponse.json({
      data: projectsWithComputed,
    });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Only admin can create projects" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate with Zod
    const validation = createProjectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const data = validation.data;

    // Create project and timeline event in transaction
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: data.name,
          type: data.type,
          buyPrice: data.buyPrice,
          buyDate: new Date(data.buyDate),
          salePrice: data.salePrice,
          listingPrice: data.listingPrice,
          address: data.address,
          status: data.status,
        },
      });

      // Auto-create timeline event
      await tx.timelineEvent.create({
        data: {
          projectId: newProject.id,
          action: "Proyecto creado",
          detail: `Proyecto "${newProject.name}" creado`,
        },
      });

      return newProject;
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
