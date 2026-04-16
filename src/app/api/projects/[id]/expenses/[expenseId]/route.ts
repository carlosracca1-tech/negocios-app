import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
} from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateExpenseSchema = z.object({
  concept: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.enum(["ARS", "USD"]).optional(),
  exchangeRate: z.number().positive().optional().nullable(),
  amountUsd: z.number().optional().nullable(),
  period: z.string().optional(),
  paidDate: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  receiptName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, expenseId } = params;
    if (!isAdmin(user)) {
      const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, projectId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateExpenseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 422 }
      );
    }

    const data = validation.data;

    // Recalculate USD if needed
    const updateData: Record<string, unknown> = { ...data };
    if (data.period) {
      updateData.period = new Date(data.period);
    }
    if (data.paidDate) {
      updateData.paidDate = new Date(data.paidDate);
    }

    const currency = data.currency ?? existing.currency;
    const amount = data.amount ?? existing.amount;
    const exchangeRate = data.exchangeRate !== undefined ? data.exchangeRate : existing.exchangeRate;

    if (currency === "ARS" && exchangeRate && exchangeRate > 0) {
      updateData.amountUsd = amount / exchangeRate;
    } else if (currency === "USD") {
      updateData.amountUsd = amount;
    }

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, expenseId } = params;
    if (!isAdmin(user)) {
      const hasAccess = await checkProjectAccess(user.id, projectId, "interactuar");
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, projectId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id: expenseId } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
