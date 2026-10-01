import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin, orgScope } from "@/lib/api-helpers";
import { computeProjectFinancials, computeBudgetProjection, safe, margenSobreInversion } from "@/lib/financial";
import { rethrowNextError } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

interface Alert {
  id: string;
  projectId: string;
  projectName: string;
  type: string;
  message: string;
  priority: 1 | 2;
  color: string;
  data?: Record<string, string | number | Date>;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let projects;

    if (isAdmin(user)) {
      // Admin: todos los proyectos de su cuenta.
      projects = await prisma.project.findMany({
        where: orgScope(user),
        include: {
          costs: true,
          expenses: true,
          partidas: { include: { cotizaciones: true } },
        },
      });
    } else {
      // Usuario comun: los de su cuenta a los que tiene acceso.
      projects = await prisma.project.findMany({
        where: {
          ...orgScope(user),
          access: {
            some: {
              userId: user.id,
            },
          },
        },
        include: {
          costs: true,
          expenses: true,
          partidas: { include: { cotizaciones: true } },
        },
      });
    }

    const alerts: Alert[] = [];
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    for (const project of projects) {
      const { totalCosts, investment, result, estimatedMargin, sinTcCount } =
        computeProjectFinancials(project, project.costs, project.expenses);
      const bp = safe(project.buyPrice);
      const sp = safe(project.salePrice);

      // Alert 1: Projects with loss (sold, result < 0)
      if (project.status === "vendido" && result < 0) {
        alerts.push({
          id: `loss-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          type: "loss",
          message: `Proyecto vendido con pérdida: $${Math.abs(result).toFixed(2)}`,
          priority: 1,
          color: "#ef4444",
          data: { result, margin: investment > 0 ? margenSobreInversion(result, investment).toFixed(2) : "0" },
        });
      }

      // Alert 2: Costs > 40% of buyPrice on active projects
      if (
        project.status === "activo" &&
        bp > 0 &&
        totalCosts > bp * 0.4
      ) {
        alerts.push({
          id: `high-costs-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          type: "high_costs",
          message: `Costos muy altos: $${totalCosts.toFixed(2)} (${((totalCosts / bp) * 100).toFixed(1)}% del precio de compra)`,
          priority: 1,
          color: "#f59e0b",
          data: {
            totalCosts,
            percentageOfBuyPrice: ((totalCosts / bp) * 100).toFixed(2),
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
          color: "#a1a1aa",
          data: { daysWithoutUpdate, lastUpdate: project.lastUpdate },
        });
      }

      // Alert 4: Estimated margin < 10% — solo proyectos activos con precio de publicación
      if (project.status === "activo" && project.listingPrice && estimatedMargin < 10) {
        alerts.push({
          id: `low-margin-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          type: "low_margin",
          message: `Margen estimado muy bajo: ${estimatedMargin.toFixed(2)}%`,
          priority: 2,
          color: "#f59e0b",
          data: { estimatedMargin: estimatedMargin.toFixed(2), listingPrice: project.listingPrice },
        });
      }

      // Alert 5: Budget deviation — rubros que superan el 90% del presupuesto
      if (project.status === "activo" && project.partidas.length > 0) {
        const budget = computeBudgetProjection(project.partidas, project.costs);
        for (const rubro of budget.byRubro) {
          if (rubro.projected > 0 && rubro.pct >= 90) {
            const excedido = rubro.pct >= 100;
            alerts.push({
              id: `budget-${project.id}-${rubro.partidaId}`,
              projectId: project.id,
              projectName: project.name,
              type: excedido ? "budget_exceeded" : "budget_warning",
              message: excedido
                ? `${rubro.name}: excedido (${rubro.pct.toFixed(0)}% del presupuesto)`
                : `${rubro.name}: al ${rubro.pct.toFixed(0)}% del presupuesto`,
              priority: excedido ? 1 : 2,
              color: excedido ? "#ef4444" : "#f59e0b",
              data: {
                rubroName: rubro.name,
                projected: rubro.projected,
                executed: rubro.executed,
                pct: rubro.pct.toFixed(1),
              },
            });
          }
        }
      }

      // Alert 6: Registros en ARS sin tipo de cambio
      if (sinTcCount > 0) {
        alerts.push({
          id: `sin-tc-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          type: "missing_exchange_rate",
          message: `${sinTcCount} registro${sinTcCount > 1 ? "s" : ""} en pesos sin tipo de cambio — no suman en el total`,
          priority: 1,
          color: "#f59e0b",
          data: { sinTcCount },
        });
      }

      // Alert 7: Gastos con vencimiento próximo (si tienen dueDate y no están pagados)
      for (const expense of project.expenses) {
        if ((expense as any).paidDate) continue;
        const dueDate = (expense as any).dueDate;
        if (dueDate) {
          const due = new Date(dueDate);
          // Días en hora Argentina (UTC-3)
          const argMs = now.getTime() - 3 * 60 * 60 * 1000;
          const argNow = new Date(argMs);
          const hoyUtc = Date.UTC(argNow.getUTCFullYear(), argNow.getUTCMonth(), argNow.getUTCDate());
          const dueUtc = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
          const daysUntilDue = Math.round((dueUtc - hoyUtc) / 86400000);
          if (daysUntilDue >= -7 && daysUntilDue <= 7) {
            const message = daysUntilDue === 0
              ? `${expense.concept} vence hoy`
              : daysUntilDue === 1
                ? `${expense.concept} vence mañana`
                : daysUntilDue > 1
                  ? `${expense.concept} vence en ${daysUntilDue} días`
                  : `${expense.concept} venció hace ${Math.abs(daysUntilDue)} día${Math.abs(daysUntilDue) > 1 ? "s" : ""}`;
            alerts.push({
              id: `due-${expense.id}`,
              projectId: project.id,
              projectName: project.name,
              type: "expense_due",
              message,
              priority: daysUntilDue <= 2 ? 1 : 2,
              color: daysUntilDue < 0 ? "#ef4444" : daysUntilDue <= 2 ? "#ef4444" : "#f59e0b",
              data: { dueDate: due.toISOString(), concept: expense.concept },
            });
          }
        }
      }
    }

    // Sort by priority (1 first, then 2)
    alerts.sort((a, b) => a.priority - b.priority);

    return NextResponse.json({ data: alerts });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error generating alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
