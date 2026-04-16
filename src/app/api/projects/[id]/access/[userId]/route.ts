import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/api-helpers";
import { rethrowNextError } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Only admin can revoke access" },
        { status: 403 }
      );
    }

    const { id: projectId, userId } = params;

    // Verify access exists
    const access = await prisma.projectAccess.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!access) {
      return NextResponse.json({ error: "Access not found" }, { status: 404 });
    }

    await prisma.projectAccess.delete({
      where: { id: access.id },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    rethrowNextError(error);
    console.error("Error revoking access:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
