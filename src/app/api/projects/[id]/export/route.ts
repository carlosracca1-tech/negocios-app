import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, checkProjectAccess, isAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { computeProjectFinancials, computeHoldingMetrics, margenSobreInversion } from "@/lib/financial";
import { fmtFecha } from "@/lib/format";

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

    const project = await prisma.project.findFirst({
      where: { id: params.id, organizationId: user.organizationId },
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
      // Inversores: admin ve todos, no-admin ve solo los suyos (mismo filtro que GET proyecto)
      investors: (isAdmin(user)
        ? project.investors
        : project.investors.filter((inv) => inv.userId === user.id)
      ).map((inv) => ({
        name: inv.name,
        capitalPercentage: inv.capitalPercentage,
        profitPercentage: inv.profitPercentage,
        amountInvested: inv.amountInvested,
        linkedUser: inv.user?.email || null,
        dividendAmount:
          result && result > 0 ? (inv.profitPercentage / 100) * result : 0,
      })),
    };

    // CSV export
    const format = req.nextUrl.searchParams.get("format");
    if (format === "csv") {
      const holding = computeHoldingMetrics({
        buyDate: project.buyDate,
        saleDate: project.saleDate,
        isVendido: project.status === "vendido",
        investment,
        result: result ?? 0,
        marginPct: margin ?? 0,
      });

      // CSV para Excel en español: BOM UTF-8, separador ;, decimales con coma
      const csvEscape = (v: unknown) => {
        const s = String(v ?? "");
        return s.includes(";") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const csvNum = (n: number | null | undefined) =>
        n != null ? n.toFixed(2).replace(".", ",") : "";

      const lines: string[] = [];

      // Resumen
      lines.push("RESUMEN");
      lines.push("Campo;Valor");
      lines.push(`Proyecto;${csvEscape(project.name)}`);
      lines.push(`Tipo;${project.type}`);
      lines.push(`Estado;${project.status}`);
      lines.push(`Compra;${csvNum(project.buyPrice)}`);
      lines.push(`Costos de obra;${csvNum(totalCosts)}`);
      lines.push(`Gastos mensuales;${csvNum(totalExpensesUsd)}`);
      lines.push(`Inversión total;${csvNum(investment)}`);
      lines.push(`Precio venta;${csvNum(project.salePrice)}`);
      lines.push(`Resultado;${csvNum(result)}`);
      lines.push(`Margen;${margin != null ? margin.toFixed(2).replace(".", ",") + "%" : ""}`);
      lines.push(`Días de tenencia;${holding.daysHeld || ""}`);
      lines.push(`Rentabilidad anualizada;${holding.annualizedPct != null ? holding.annualizedPct.toFixed(2).replace(".", ",") + "%" : ""}`);

      // Costos
      lines.push("");
      lines.push("COSTOS");
      lines.push("Concepto;Monto;Moneda;TC;Monto USD;Categoría;Tipo;Fecha");
      for (const c of project.costs) {
        lines.push([
          csvEscape(c.concept), csvNum(c.amount), c.currency,
          c.exchangeRate ? csvNum(c.exchangeRate) : "",
          c.amountUsd ? csvNum(c.amountUsd) : "", c.category, c.costType,
          fmtFecha(c.date),
        ].join(";"));
      }

      // Gastos
      lines.push("");
      lines.push("GASTOS MENSUALES");
      lines.push("Concepto;Monto;Moneda;Monto USD;Periodo;Fecha pago");
      for (const e of project.expenses) {
        lines.push([
          csvEscape(e.concept), csvNum(e.amount), e.currency,
          e.amountUsd ? csvNum(e.amountUsd) : "",
          fmtFecha(e.period),
          e.paidDate ? fmtFecha(e.paidDate) : "",
        ].join(";"));
      }

      // Inversores (filtrados por rol)
      const visibleInvestors = isAdmin(user)
        ? project.investors
        : project.investors.filter((inv) => inv.userId === user.id);

      if (visibleInvestors.length > 0) {
        lines.push("");
        lines.push("INVERSORES");
        lines.push("Nombre;Capital %;Ganancia %;Invertido;Dividendo");
        for (const inv of visibleInvestors) {
          const dividendo = result && result > 0 ? (inv.profitPercentage / 100) * result : 0;
          lines.push([
            csvEscape(inv.name), csvNum(inv.capitalPercentage), csvNum(inv.profitPercentage),
            csvNum(inv.amountInvested), csvNum(dividendo),
          ].join(";"));
        }
      }

      // BOM UTF-8 para que Excel lo abra bien
      const BOM = "\uFEFF";
      const csv = BOM + lines.join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv"`,
        },
      });
    }

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error("Error exporting project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
