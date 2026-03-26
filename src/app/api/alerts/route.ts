import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/api-helpers";

interface Alert {
  id: string;
  projectId: string;
  projectName: string;
  type: string;
  message: string;
  priority: 1 | 2;
  data?: Record<string, any>;
}

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
        },
      });
    }

    const alerts: Alert[] = [];
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    for (const project of projects) {
      const totalCosts = project.costs.reduce((sum, cost) => sum + cost.amount, 0);
      const investment = project.buyPrice + totalCosts;
      const result = project.salePrice ? project.salePrice - investment : 0;
      const estimatedMargin = project.listingPrice
        ? (((project.listingPrice - investment) / project.listingPrice) * 100)
        : 0;

      // Alert 1: Projects with loss (sold, result < 0)
      if (project.status === "vendido" && result < 0) {
        alerts.push({
          id: `loss-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          type: "loss",
          message: `Proyecto vendido con pérdida: $${Math.abs(result).toFixed(2)}`,
          priority: 1,
          data: { result, margin: ((result / project.salePrice!) * 100).toFixed(2) },
        });
      }

      // Alert 2: Costs > 40% of buyPrice on active projects
      if (
        project.status === "activo" &&
        totalCosts > project.buyPrice * 0.4
      ) {
        alerts.push({
          id: `high-costs-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          type: "high_costs",
          message: `Costos muy altos: $${totalCosts.toFixed(2)} (${((totalCosts / project.buyPrice) * 100).toFixed(1)}% del precio de compra)`,
          priority: 1,
          data: {
            totalCosts,
            percentageOfBuyPrice: ((totalCosts / project.buyPrice) * 100).toFixed(2),
          },
        });
      }

      // Alert 3: No update in 14+ days on active projects
      if (project.status === "activo" && project.lastUpdate <= fourteenDaysAgo) {
        const daysWithoutUpdate = Math.floor(
          (now.getTime() - project.lastUpdate.getTime()) / (24 * 60 * 60 * 1000)
        );
        alerts.push({
          id: `stale-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          type: "stale",
          message: `Proyecto sin actualizar hace ${daysWithoutUpdate} días`,
          priority: 2,
          data: { daysWithoutUpdate, lastUpdate: project.lastUpdate },
        });
      }

      // Alert 4: Estimated margin < 10%
      if (project.listingPrice && estimatedMargin < 10) {
        alerts.push({
          id: `low-margin-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          type: "low_margin",
          message: `Margen estimado muy bajo: ${estimatedMargin.toFixed(2)}%`,
          priority: 2,
          data: { estimatedMargin: estimatedMargin.toFixed(2), listingPrice: project.listingPrice },
        });
      }
    }

    // Sort by priority (1 first, then 2)
    alerts.sort((a, b) => a.priority - b.priority);

    return NextResponse.json({ data: alerts });
  } catch (error) {
    console.error("Error generating alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
