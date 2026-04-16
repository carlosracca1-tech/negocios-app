import { prisma } from "./prisma";

/**
 * Create notifications for all investors/users with access to a project
 */
export async function notifyProjectUsers(
  projectId: string,
  type: string,
  message: string,
  excludeUserId?: string
) {
  try {
    // Get all users with access to this project
    const accessList = await prisma.projectAccess.findMany({
      where: { projectId },
      select: { userId: true },
    });

    // Get all investors linked to user accounts
    const investors = await prisma.investor.findMany({
      where: { projectId, userId: { not: null } },
      select: { userId: true },
    });

    // Combine unique user IDs
    const userIds = new Set<string>();
    accessList.forEach((a) => userIds.add(a.userId));
    investors.forEach((i) => {
      if (i.userId) userIds.add(i.userId);
    });

    // Exclude the user who triggered the action
    if (excludeUserId) userIds.delete(excludeUserId);

    // Get all admin users too
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });
    admins.forEach((a) => userIds.add(a.id));
    if (excludeUserId) userIds.delete(excludeUserId);

    if (userIds.size === 0) return;

    // Create notifications
    await prisma.notification.createMany({
      data: Array.from(userIds).map((userId) => ({
        userId,
        type,
        message,
        projectId,
      })),
    });
  } catch (error) {
    console.error("Error creating notifications:", error);
  }
}
