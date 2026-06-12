import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, checkProjectAccess } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { computeProjectFinancials } from "@/lib/financial";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkProjectAccess(user.id, params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        costs: { orderBy: { date: "desc" } },
        expenses: { orderBy: { period: "desc" } },
        investors: { include: { user: { select: { name: true, email: true } } } },
        timeline: { orderBy: { date: "desc" } },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    // Single source of truth: normaliza ARS->USD via amountUsd (igual que el dashboard)
    const fin = computeProjectFinancials(
      project,
      project.costs,
      project.expenses
    );
    const totalCosts = fin.totalCosts;
    const totalExpensesUsd = fin.totalExpenses;
    const investment = fin.investment;
    const result = project.salePrice ? fin.result : null;
    const margin = project.salePrice ? fin.margin : null;

    const report = {
      generatedAt: new Date().toISOString(),
      project: {
        name: project.name,
        type: project.type,
        status: project.status,
        address: project.address,
        buyDate: project.buyDate,
        saleDate: project.saleDate,
        buyerName: project.buyerName,
      },
      financial: {
        buyPrice: project.buyPrice,
        totalCosts,
        totalExpensesUsd,
        investment,
        salePrice: project.salePrice,
        listingPrice: project.listingPrice,
        result,
        margin,
      },
      costs: project.costs.map((c) => ({
        concept: c.concept,
        amount: c.amount,
        currency: c.currency,
        exchangeRate: c.exchangeRate,
        amountUsd: c.amountUsd,
        category: c.category,
        costType: c.costType,
        date: c.date,
      })),
      expenses: project.expenses.map((e) => ({
        concept: e.concept,
        amount: e.amount,
        currency: e.currency,
        amountUsd: e.amountUsd,
        period: e.period,
        paidDate: e.paidDate,
      })),
      investors: project.investors.map((inv) => ({
        name: inv.name,
        capitalPercentage: inv.capitalPercentage,
        profitPercentage: inv.profitPercentage,
        amountInvested: inv.amountInvested,
        linkedUser: inv.user?.email || null,
        dividendAmount:
          result && result > 0 ? (inv.profitPercentage / 100) * result : 0,
      })),
    };

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error("Error exporting project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
