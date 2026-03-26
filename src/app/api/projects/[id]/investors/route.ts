import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isAdmin,
  checkProjectAccess,
  addInvestorSchema,
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
    });

    return NextResponse.json({ data: investors });
  } catch (error) {
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
        { error: "Only admin can add investors" },
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

    // Check total percentage
    const existingInvestors = await prisma.investor.findMany({
      where: { projectId },
    });

    const totalPercentage = existingInvestors.reduce(
      (sum, investor) => sum + investor.percentage,
      0
    );

    if (totalPercentage + data.percentage > 100) {
      return NextResponse.json(
        {
          error: "Total investor percentages cannot exceed 100%",
          current: totalPercentage,
          requested: data.percentage,
        },
        { status: 422 }
      );
    }

    const investor = await prisma.investor.create({
      data: {
        projectId,
        name: data.name,
        percentage: data.percentage,
      },
    });

    return NextResponse.json({ data: investor }, { status: 201 });
  } catch (error) {
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
        { error: "Only admin can delete investors" },
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
    console.error("Error deleting investor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
