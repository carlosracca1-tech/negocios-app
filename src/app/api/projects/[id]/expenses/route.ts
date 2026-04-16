import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import { notifyProjectUsers } from "@/lib/notifications";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createExpenseSchema = z.object({
  concept: z.string().min(1, "Concept is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(["ARS", "USD"]).default("ARS"),
  exchangeRate: z.number().positive().optional().nullable(),
  amountUsd: z.number().optional().nullable(),
  period: z.string().min(1, "Period is required"),
  paidDate: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  receiptName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

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
    const hasAccess = await checkProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expenses = await prisma.expense.findMany({
      where: { projectId },
      orderBy: { period: "desc" },
    });

    return NextResponse.json({ data: expenses });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error fetching expenses:", error);
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
    if (!isAdmin(user)) {
      const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = createExpenseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const data = validation.data;

    // Calculate USD amount if ARS + exchange rate provided
    let amountUsd = data.amountUsd ?? null;
    if (data.currency === "ARS" && data.exchangeRate && data.exchangeRate > 0) {
      amountUsd = data.amount / data.exchangeRate;
    } else if (data.currency === "USD") {
      amountUsd = data.amount;
    }

    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          projectId,
          concept: data.concept,
          amount: data.amount,
          currency: data.currency,
          exchangeRate: data.exchangeRate ?? null,
          amountUsd,
          period: new Date(data.period),
          paidDate: data.paidDate ? new Date(data.paidDate) : null,
          receiptUrl: data.receiptUrl ?? null,
          receiptName: data.receiptName ?? null,
          notes: data.notes ?? null,
        },
      });

      await tx.timelineEvent.create({
        data: {
          projectId,
          action: "Gasto mensual agregado",
          detail: `${data.concept} - $${data.amount} ${data.currency}`,
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { lastUpdate: new Date() },
      });

      return newExpense;
    });

    // Send notifications to project users
    await notifyProjectUsers(
      projectId,
      "expense_added",
      `Nuevo gasto: ${data.concept}`,
      user.id
    );

    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
